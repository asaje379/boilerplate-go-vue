import { apiRequest } from "@/services/http/client";
import type { UploadFileResponse } from "@/types/file";

export const filesApi = {
  upload(file: File, visibility: "private" | "public" = "private", path?: string) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("visibility", visibility);
    if (path?.trim()) {
      formData.set("path", path.trim());
    }

    return apiRequest<UploadFileResponse>("/files/upload", {
      body: formData,
      method: "POST",
    });
  },
};
