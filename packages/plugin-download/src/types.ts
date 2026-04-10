import { ProgressEventData } from '@blazion/core';

declare module '@blazion/core' {
  interface BlazionPluginIndividualRequestConfig {
    onDownloadProgress?: (event: ProgressEventData) => void;
  }
}
