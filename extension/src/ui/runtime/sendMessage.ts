import { ExtensionMessage } from '../../shared/types';

export class RuntimeMessageError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'RuntimeMessageError';
  }
}

export const sendMessage = async <T = any>(message: ExtensionMessage): Promise<T> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new RuntimeMessageError(chrome.runtime.lastError.message || 'Unknown runtime error'));
      }
      
      if (response && response.error) {
        return reject(new RuntimeMessageError(response.error, response.details));
      }
      
      resolve(response as T);
    });
  });
};
