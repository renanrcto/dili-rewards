import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface R2Config {
  bucket: string;
  // Endereço público do bucket (domínio próprio ou r2.dev), sem barra final.
  publicUrl: string;
  client: S3Client;
}

/**
 * Arquivos no Cloudflare R2 (API compatível com S3). No banco fica só a URL
 * pública devolvida por `upload`.
 *
 * Sem as variáveis R2_* a API sobe normalmente e só os uploads falham —
 * mesmo comportamento do e-mail sem SMTP.
 */
@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly config: R2Config | null;

  constructor(configService: ConfigService) {
    const accountId = configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = configService.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = configService.get<string>('R2_BUCKET');
    const publicUrl = configService.get<string>('R2_PUBLIC_URL');

    if (
      !accountId ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucket ||
      !publicUrl
    ) {
      this.logger.warn('R2 não configurado: uploads de imagem desativados');
      this.config = null;
      return;
    }

    this.config = {
      bucket,
      publicUrl: publicUrl.replace(/\/+$/, ''),
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
        // O R2 não aceita todos os checksums que o SDK v3 manda por padrão.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      }),
    };
  }

  /** Grava o arquivo em `key` e devolve a URL pública dele. */
  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const { client, bucket, publicUrl } = this.requireConfig();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Cada upload ganha uma chave nova, então o arquivo nunca muda.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${publicUrl}/${key}`;
  }

  /** Se a URL aponta para um arquivo deste bucket. */
  isOwnUrl(url: string): boolean {
    return !!this.config && url.startsWith(`${this.config.publicUrl}/`);
  }

  /**
   * Remove o arquivo de uma URL devolvida por `upload`. Nunca lança: um
   * arquivo que sobrar no bucket não pode desfazer a operação que já foi
   * gravada no banco.
   */
  async deleteByUrl(url: string): Promise<void> {
    if (!this.config || !this.isOwnUrl(url)) return;

    const key = url.slice(this.config.publicUrl.length + 1);
    try {
      await this.config.client.send(
        new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao remover ${key} do R2: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private requireConfig(): R2Config {
    if (!this.config) {
      throw new ServiceUnavailableException(
        'Upload de imagens indisponível: armazenamento não configurado.',
      );
    }
    return this.config;
  }
}
