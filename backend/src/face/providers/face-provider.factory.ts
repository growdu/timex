import { Injectable, Logger, Inject } from '@nestjs/common';
import type { FaceConfig } from '../../config/face.config';
import { FACE_CONFIG } from '../../config/face.config';
import { CloudFaceProvider } from './cloud.face-provider';
import { FaceProvider } from './face-provider.interface';
import { LocalFaceProvider } from './local.face-provider';
import { MockFaceProvider } from './mock.face-provider';

@Injectable()
export class FaceProviderFactory {
  private log = new Logger(FaceProviderFactory.name);
  private _instance?: FaceProvider;

  constructor(
    @Inject(FACE_CONFIG) private cfg: FaceConfig,
    private cloud: CloudFaceProvider,
    private local: LocalFaceProvider,
    private mock: MockFaceProvider,
  ) {}

  resolve(): FaceProvider {
    if (this._instance) return this._instance;
    let p: FaceProvider;
    switch (this.cfg.provider) {
      case 'cloud':
        p = this.cloud;
        break;
      case 'local':
        p = this.local;
        break;
      case 'mock':
      default:
        p = this.mock;
    }
    this.log.log(
      `FaceProvider resolved: ${p.name} (cfg.provider=${this.cfg.provider})`,
    );
    this._instance = p;
    return p;
  }
}
