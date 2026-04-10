import { ProgressEventData } from '@blazion/core';

declare module '@blazion/core' {
  interface BlazionPluginIndividualRequestConfig {
    onUploadProgress?: (event: ProgressEventData) => void;
  }
}
