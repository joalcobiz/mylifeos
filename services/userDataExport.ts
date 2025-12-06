import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const COLLECTIONS_TO_EXPORT = [
    'projects',
    'tasks',
    'journals',
    'places',
    'events',
    'trips',
    'habits',
    'goals',
    'finances',
    'groceries',
    'purchases',
    'templates',
    'loans',
    'quickNotes',
    'contacts'
];

export interface UserDataExport {
    exportDate: string;
    userId: string;
    userName: string;
    collections: Record<string, any[]>;
}

export const exportUserData = async (userId: string, userName: string): Promise<UserDataExport> => {
    const exportData: UserDataExport = {
        exportDate: new Date().toISOString(),
        userId,
        userName,
        collections: {}
    };

    for (const collectionName of COLLECTIONS_TO_EXPORT) {
        try {
            const collRef = collection(db, collectionName);
            const q = query(collRef, where('owner', '==', userId));
            const snapshot = await getDocs(q);
            
            exportData.collections[collectionName] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error exporting ${collectionName}:`, error);
            exportData.collections[collectionName] = [];
        }
    }

    return exportData;
};

export const downloadExportAsJson = (exportData: UserDataExport) => {
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifeos-export-${exportData.userName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const deleteUserData = async (
    userId: string,
    option: 'delete-all' | 'transfer' | 'keep-shared',
    transferToUserId?: string
): Promise<{ deletedCount: number; transferredCount: number; preservedCount: number }> => {
    const stats = { deletedCount: 0, transferredCount: 0, preservedCount: 0 };

    for (const collectionName of COLLECTIONS_TO_EXPORT) {
        try {
            const { collection: firestoreCollection, getDocs: getDocs2, query: query2, where: where2, doc, updateDoc, deleteDoc } = await import('firebase/firestore');
            const collRef = firestoreCollection(db, collectionName);
            const q = query2(collRef, where2('owner', '==', userId));
            const snapshot = await getDocs2(q);

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();
                const docRef = doc(db, collectionName, docSnapshot.id);

                if (option === 'delete-all') {
                    await deleteDoc(docRef);
                    stats.deletedCount++;
                } else if (option === 'transfer' && transferToUserId) {
                    await updateDoc(docRef, { 
                        owner: transferToUserId,
                        transferredFrom: userId,
                        transferDate: new Date().toISOString()
                    });
                    stats.transferredCount++;
                } else if (option === 'keep-shared') {
                    if (data.isShared && data.sharedWith?.length > 0) {
                        const newOwner = data.sharedWith[0];
                        await updateDoc(docRef, { 
                            owner: newOwner,
                            sharedWith: data.sharedWith.filter((id: string) => id !== newOwner),
                            previousOwner: userId
                        });
                        stats.preservedCount++;
                    } else {
                        await deleteDoc(docRef);
                        stats.deletedCount++;
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing ${collectionName}:`, error);
        }
    }

    return stats;
};
