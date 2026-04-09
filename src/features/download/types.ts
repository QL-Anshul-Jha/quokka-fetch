import { ProgressEventData } from '../../utils';

declare module '../../utils/types' {
  interface BlazionPluginIndividualRequestConfig {
    onDownloadProgress?: (event: ProgressEventData) => void;
  }
}
