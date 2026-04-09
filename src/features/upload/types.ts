import { ProgressEventData } from '../../utils';

declare module '../../utils/types' {
  interface BlazionPluginIndividualRequestConfig {
    onUploadProgress?: (event: ProgressEventData) => void;
  }
}
