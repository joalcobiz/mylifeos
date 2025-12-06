
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const uploadPhoto = async (file: File, path: string): Promise<string> => {
    const compressed = await compressImage(file, 1200, 0.8);
    return uploadFile(compressed, path);
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!storage) {
        console.warn("Storage not configured. Returning fake URL.");
        return new Promise(resolve => setTimeout(() => resolve(URL.createObjectURL(file)), 1000));
    }

    try {
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `${path}/${filename}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};

export const deleteFile = async (url: string): Promise<void> => {
    if (!storage) {
        console.warn("Storage not configured. Skipping delete.");
        return;
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        const pathMatch = decodedUrl.match(/o\/(.+?)\?/);
        if (pathMatch && pathMatch[1]) {
            const filePath = pathMatch[1];
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
        }
    } catch (error) {
        console.error("Error deleting file:", error);
        throw error;
    }
};
