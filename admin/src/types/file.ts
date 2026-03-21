export interface UploadedFile {
  bucket: string
  contentType: string
  createdAt: string
  id: string
  originalName: string
  provider: string
  sizeBytes: number
  storageKey: string
  storedName: string
  updatedAt: string
  uploadedById: string
  visibility: 'private' | 'public'
}

export interface UploadFileResponse {
  file: UploadedFile
}
