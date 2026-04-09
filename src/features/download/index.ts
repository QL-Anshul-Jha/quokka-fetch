import { BlazionPlugin, BlazionPluginName, BlazionInternalPublic } from '../../utils';
import { trackDownloadProgress } from './helpers';
import './types'; // Ensure module augmentation is loaded

export const DownloadPlugin = (): BlazionPlugin => {
  return {
    name: BlazionPluginName.DOWNLOAD,
    install(instance: BlazionInternalPublic) {
      if (typeof window === 'undefined') return;

      const currentAdapter = instance.engineAdapter;

      instance.engineAdapter = async (url, config, body, defaultFetch) => {
        let response: Response;
        if (currentAdapter) {
          response = await currentAdapter(url, config, body, defaultFetch);
        } else {
          response = await defaultFetch(url, { ...config, body } as RequestInit);
        }

        if (config.onDownloadProgress) {
          response = trackDownloadProgress(response, config.onDownloadProgress);
        }

        return response;
      };
    }
  };
};
