import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { Script, UXTestResult, Question } from './types';
import OpenAI from 'openai';
import keys from './keys';

const app: Express = express();

const baseDir = path.resolve(__dirname, '.');

const MEDIA_FOLDER_NAME = 'mymedia';
const MEDIA_PATH = path.join(baseDir, MEDIA_FOLDER_NAME);
app.use(`/${MEDIA_FOLDER_NAME}`, express.static(MEDIA_PATH));

const port = 3000;
app.use(cors({
  origin: 'http://localhost:3001'
}));

const upload = multer({
  dest: MEDIA_PATH,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpeg', '.jpg', '.png'];
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, and PNG files are allowed.'));
    }
  },
});

// Create the media directory if it doesn't exist
if (!fs.existsSync(MEDIA_PATH)) {
  fs.mkdirSync(MEDIA_PATH, { recursive: true });
}

// Stores files to the corresponding mediaId folder (or creates one if no mediaId is provided)
// media files for the same mediaId will be named by the order they are uploaded: 
// e.g 001.jpg, 002.png, 003.jpg.. etc
// Example img path: media/{mediaId}/xxx.png
app.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  console.log('uploading...');
  const mediaId = req.body.mediaId as string | undefined;
  if ((mediaId?.indexOf('..') ?? -1) >= 0 || (mediaId?.indexOf('/') ?? -1) >= 0 ) {
    return res.status(400).json({ error: 'Invalid media id' });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const mediaFolder = mediaId ? path.join(MEDIA_PATH, mediaId) : path.join(MEDIA_PATH, uuidv4());
  const fileExtension = path.extname(file.originalname).slice(1);

  const fileName = mediaId
    ? `${String(getHighestFileNumber(mediaFolder) + 1).padStart(3, '0')}.${fileExtension}`
    : '001.' + fileExtension;
  const filePath = path.join(mediaFolder, fileName);

  fs.mkdirSync(mediaFolder, { recursive: true });
  fs.renameSync(file.path, filePath);

  return res.status(200).json({ mediaId: path.basename(mediaFolder) });
});

// Looks at files named numerically (such as 001.png, 002.png, 003.png)
// and returns the highest number e.g 003.
function getHighestFileNumber(folder: string): number {
  let highestNumber = 0;
  try {
    const files = fs.readdirSync(folder);
    for (const file of files) {
      const match = file.match(/^(\d+)\.(\w+)$/);
      if (match) {
        const number = parseInt(match[1]);
        if (number > highestNumber) {
          highestNumber = number;
        }
      }
    }
  } catch (err) {
    // Ignore errors, return 0 if the folder doesn't exist
  }
  return highestNumber;
}


app.get('/media/:mediaId', (req: Request, res: Response) => {
  const mediaId = req.params.mediaId;
  if ((mediaId.indexOf('..') ?? -1) >= 0 || (mediaId.indexOf('/') ?? -1) >= 0) {
    return res.status(400).json({ error: 'Invalid media id' });
  }

  const mediaFolder = path.join(MEDIA_PATH, mediaId);
  if (!fs.existsSync(mediaFolder)) {
    return res.status(404).json({ error: 'Media folder not found' });
  }

  try {
    const files = fs.readdirSync(mediaFolder);
    const images = files.filter((file) => {
      const extension = path.extname(file).toLowerCase();
      return ['.jpeg', '.jpg', '.png'].includes(extension);
    });

    return res.status(200).json({ images });
  } catch (err) {
    console.error('Error getting images:', err);
    return res.status(500).json({ error: 'Error getting images' });
  }
});

app.post('/uxtest', express.json(), async (req: Request, res: Response) => {
  console.log('/uxtest');
  const timestampStart = new Date().toISOString();

  const { script, mediaId, openAIKey }: { script: Script; mediaId: string; assistantId?: string, openAIKey?: string } = req.body;
  let { assistantId }: { script: Script; mediaId: string; assistantId?: string } = req.body;
  console.log('openaiKey from frontend', openAIKey);
  let apiKey = openAIKey == null? keys.openai: openAIKey;
  if (apiKey == null ){
    return res.status(400).json({ error: 'Please provide an openai key'})
  } 
  const openai = new OpenAI({
    apiKey,
  });

  if (!script || !mediaId) {
    return res.status(400).json({ error: 'Script and mediaId are required.' });
  }

  // Validate mediaId
  if ((mediaId.indexOf('..') ?? -1) >= 0 || (mediaId.indexOf('/') ?? -1) >= 0) {
    return res.status(400).json({ error: 'Invalid media id' });
  }

  const mediaFolder = path.join(MEDIA_PATH, mediaId);
  if (!fs.existsSync(mediaFolder)) {
    return res.status(404).json({ error: 'Media folder not found' });
  }

  // Get media files
  const mediaFiles = fs.readdirSync(mediaFolder)
    .filter(file => ['.jpeg', '.jpg', '.png'].includes(path.extname(file).toLowerCase()))
    .map(fileName => `${path.join(MEDIA_PATH, mediaId, fileName)}`);
  console.log('mediaFiles', mediaFiles);

  try {
    // 1. Create an assistant if no assistant id provided
    let assistant;
    if (assistantId == null) {
      console.log('Creating new assistant...');
      assistant = await openai.beta.assistants.create({
        name: "UX Tester",
        instructions: "You are a helpful participant in a user interview / UX test session.",
        model: "gpt-4o"
      });
      assistantId = assistant.id;
    }

    // Create a new thread
    console.log('Creating new thread...');
    const thread = await openai.beta.threads.create();

    // Add the first question and media to the thread
    console.log('Adding initial message to thread...');
    const fileObjs = await Promise.all(mediaFiles.map(async (filePath) => {
      const aiFile = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: "vision",
      });
      return {
        type: "image_file" as const,
        image_file: { file_id: aiFile.id }
      };
    }));

    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: [
          { type: "text", text: script.questions[0].text },
          ...fileObjs
        ]
      }
    );

    // 2. Get the response for the first question
    console.log('Getting response for the first question...');
    // const initialRun = await openai.beta.threads.runs.create(thread.id, { assistant_id: assistantId });
    const msgs = await makeRun(openai, thread.id, assistantId);
    const initialResponse = msgs[0].content[0].text.value;
    console.log('Initial Response', initialResponse);
    // console.log('Initial Response2', msgs[1].content[0].text.value);

    // Initialize UXTestResult
    const uxTestResult: UXTestResult = {
      id: uuidv4(),
      scriptId: script.id,
      mediaId: mediaId,
      timestampStart,
      scriptName: script.name,
      timestampEnd: new Date().toISOString(),
      media: mediaFiles.map(fullPath => path.join(MEDIA_FOLDER_NAME, fullPath.split(MEDIA_FOLDER_NAME)[1])),
      assistantId: assistantId ?? '',
      responses: [{ question: script.questions[0], response: initialResponse }]
    };

    // 3. Process remaining questions
    for (let i = 1; i < script.questions.length; i++) {
      console.log(`Processing question ${i + 1}...`);
      const question = script.questions[i];
      const response = await runOnImage(openai, thread.id, (assistantId ?? ''), question.text);
      console.log('response ', i, ' ', response);
      uxTestResult.responses.push({ question, response });
    }

    // 4. Return the UXTestResult object
    uxTestResult.timestampEnd =  new Date().toISOString(); 
    res.status(200).json(uxTestResult);
  } catch (error) {
    console.error('Error in UX test:', error);
    res.status(500).json({ error: 'An error occurred during the UX test' });
  }
});

async function makeRun(openai: any, threadId: string, assistantId: string): Promise<any> {
  console.log('starting Run....');
  let run = await openai.beta.threads.runs.createAndPoll(
    threadId,
    { 
      assistant_id: assistantId
    }
  );
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(
      run.thread_id
    );

    
    for (const message of messages.data) {
      console.log(`${message.role} > ${message.content[0].text.value}`);
    }
    
    console.log('msgs', messages.data);
    return messages.data;
  } else {
    console.log(run.status);
  }
}
async function runOnImage(openai: any, threadId: string, assistantId: string, text: string): Promise<string> {
  console.log('Running question:', text);
  await openai.beta.threads.messages.create(
    threadId,
    {
      role: "user",
      content: text
    }
  );
  const messages = await makeRun(openai, threadId, assistantId);
  return messages[0].content[0].text.value;
}

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
