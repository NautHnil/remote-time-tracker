import fs from "fs";

const DEFAULT_RETRY_DELAYS_MS = [150, 400, 1000];

interface DeleteFileWithRetriesOptions {
  fileLabel?: string;
  retryDelaysMs?: number[];
  logPrefix?: string;
}

interface MoveFileWithRetriesOptions {
  fileLabel?: string;
  retryDelaysMs?: number[];
  logPrefix?: string;
}

export async function deleteFileWithRetries(
  filePath: string,
  options: DeleteFileWithRetriesOptions = {},
): Promise<boolean> {
  if (!filePath || !fs.existsSync(filePath)) {
    return true;
  }

  const {
    fileLabel = filePath,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    logPrefix = "Delete",
  } = options;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error: any) {
      if (!fs.existsSync(filePath)) {
        return true;
      }

      const isRetryable = isRetryableDeleteError(error);
      const retryDelay = retryDelaysMs[attempt];

      if (isRetryable && retryDelay !== undefined) {
        console.warn(
          `${logPrefix} retry ${attempt + 1}/${retryDelaysMs.length} for ${fileLabel} after ${error.code || "UNKNOWN"}`,
        );
        await sleep(retryDelay);
        continue;
      }

      if (isRetryable) {
        console.warn(
          `${logPrefix} skipped for ${fileLabel} because it is still locked (${error.code || "UNKNOWN"})`,
        );
        return false;
      }

      throw error;
    }
  }

  return !fs.existsSync(filePath);
}

export async function moveFileWithRetries(
  sourcePath: string,
  targetPath: string,
  options: MoveFileWithRetriesOptions = {},
): Promise<string> {
  if (!sourcePath || !targetPath) {
    throw new Error("Both sourcePath and targetPath are required");
  }

  if (!fs.existsSync(sourcePath)) {
    return targetPath;
  }

  const {
    fileLabel = sourcePath,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    logPrefix = "Move",
  } = options;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      await fs.promises.rename(sourcePath, targetPath);
      return targetPath;
    } catch (error: any) {
      if (!fs.existsSync(sourcePath)) {
        return targetPath;
      }

      if (error?.code === "EXDEV") {
        await fs.promises.copyFile(sourcePath, targetPath);
        await deleteFileWithRetries(sourcePath, {
          fileLabel,
          retryDelaysMs,
          logPrefix: `${logPrefix} cleanup`,
        });
        return targetPath;
      }

      const isRetryable = isRetryableFileAccessError(error);
      const retryDelay = retryDelaysMs[attempt];

      if (isRetryable && retryDelay !== undefined) {
        console.warn(
          `${logPrefix} retry ${attempt + 1}/${retryDelaysMs.length} for ${fileLabel} after ${error.code || "UNKNOWN"}`,
        );
        await sleep(retryDelay);
        continue;
      }

      throw error;
    }
  }

  return targetPath;
}

function isRetryableDeleteError(error: any): boolean {
  return isRetryableFileAccessError(error);
}

function isRetryableFileAccessError(error: any): boolean {
  const errorCode = error?.code;
  return (
    errorCode === "EPERM" ||
    errorCode === "EBUSY" ||
    errorCode === "EACCES"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
