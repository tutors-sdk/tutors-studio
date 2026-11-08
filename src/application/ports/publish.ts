/** Driven port: hands a course off to be published. System git first; GitHub API or Netlify direct later. */
export interface PublishStatus {
  isRepository: boolean;
  changedFiles: string[];
  signedIn: boolean;
}

export interface PublishPort {
  status(): Promise<PublishStatus>;
  commit(message: string): Promise<void>;
  push(): Promise<void>;
  login(): Promise<boolean>;
}
