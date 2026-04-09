import { BlazionPlugin, BlazionPluginName, BlazionInternalPublic } from '../../utils';
import { executeXhrWithUploadProgress } from './helpers';
import './types'; // Ensure module augmentation is loaded

export const UploadPlugin = (): BlazionPlugin => {
  return {
    name: BlazionPluginName.UPLOAD,
    install(instance: BlazionInternalPublic) {
      if (typeof window === 'undefined') return;

      const currentAdapter = instance.engineAdapter;

      instance.engineAdapter = async (url, config, body, defaultFetch) => {
        if (config.onUploadProgress) {
          return await executeXhrWithUploadProgress(url, config, body);
        }

        if (currentAdapter) return await currentAdapter(url, config, body, defaultFetch);
        return await defaultFetch(url, { ...config, body } as RequestInit);
      };
    }
  };
};
