export interface Question {
    id: string;
    text: string;
    userFollowUp?: boolean;
}
  
export interface Script {
    id: string;
    name: string;
    questions: Question[];
}

export interface ImageFile {
    file: File;
    preview: string;
}

export interface Response {
    // timestamp,
    question: Question,
    response: string
}



export interface UXTestResult {
    id: string;
    scriptId: string;
    scriptName: string;
    mediaId: string;
    timestampStart: string;
    timestampEnd: string;
    media: string[];
    personaId?: string;
    assistantId: string;
    responses: Response[];
}