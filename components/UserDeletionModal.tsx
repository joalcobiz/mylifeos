import React, { useState } from 'react';
import { AlertTriangle, Trash2, UserMinus, Share2, Download, Loader2, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { Button } from './ui';
import { User } from '../contexts/AuthContext';

export type DeletionOption = 'delete-all' | 'transfer' | 'keep-shared';

interface UserDeletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToDelete: User;
    currentUser: User;
    availableUsers?: User[];
    onConfirmDeletion: (option: DeletionOption, transferTo?: string) => Promise<void>;
    onExportData?: () => Promise<void>;
}

const UserDeletionModal: React.FC<UserDeletionModalProps> = ({
    isOpen,
    onClose,
    userToDelete,
    currentUser,
    availableUsers = [],
    onConfirmDeletion,
    onExportData
}) => {
    const [selectedOption, setSelectedOption] = useState<DeletionOption>('delete-all');
    const [transferTarget, setTransferTarget] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [step, setStep] = useState<'options' | 'confirm'>('options');

    const otherUsers = availableUsers.filter(u => u.uid !== userToDelete.uid);
    const isSelfDeletion = currentUser.uid === userToDelete.uid;
    const requiredConfirmText = `DELETE ${userToDelete.displayName?.toUpperCase()}`;

    const handleExport = async () => {
        if (!onExportData) return;
        setIsExporting(true);
        try {
            await onExportData();
        } finally {
            setIsExporting(false);
        }
    };

    const handleProceed = () => {
        if (selectedOption === 'transfer' && !transferTarget) {
            return;
        }
        setStep('confirm');
    };

    const handleConfirmDeletion = async () => {
        if (confirmText !== requiredConfirmText) return;
        
        setIsProcessing(true);
        try {
            await onConfirmDeletion(selectedOption, selectedOption === 'transfer' ? transferTarget : undefined);
            onClose();
        } catch (error) {
            console.error('Error during deletion:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setStep('options');
        setSelectedOption('delete-all');
        setTransferTarget('');
        setConfirmText('');
        onClose();
    };

    const deletionOptions = [
        {
            id: 'delete-all' as DeletionOption,
            icon: Trash2,
            title: 'Delete All Data',
            description: 'Permanently remove all data owned by this user. Shared items will be deleted. This action cannot be undone.',
            color: 'red',
            warning: 'This will permanently delete all projects, tasks, journal entries, and other data.'
        },
        {
            id: 'transfer' as DeletionOption,
            icon: Share2,
            title: 'Transfer Data',
            description: 'Transfer ownership of all data to another user before removing this account.',
            color: 'blue',
            warning: 'All items will be transferred to the selected user.'
        },
        {
            id: 'keep-shared' as DeletionOption,
            icon: UserMinus,
            title: 'Keep Shared Data',
            description: 'Delete personal data but keep items that are shared with others. Ownership will transfer to the first shared user.',
            color: 'amber',
            warning: 'Private items will be deleted, shared items will remain accessible.'
        }
    ];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose}
            title={step === 'options' ? 'Delete User Account' : 'Confirm Deletion'}
        >
            {step === 'options' ? (
                <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-medium text-red-800">
                                {isSelfDeletion 
                                    ? 'You are about to delete your own account'
                                    : `You are about to delete ${userToDelete.displayName}'s account`
                                }
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                                This action will affect all data associated with this account.
                            </p>
                        </div>
                    </div>

                    {onExportData && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-blue-800 flex items-center gap-2">
                                        <Download size={16} />
                                        Export Data First
                                    </p>
                                    <p className="text-sm text-blue-600 mt-1">
                                        Download a backup of all user data before deletion
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin mr-2" />
                                            Exporting...
                                        </>
                                    ) : (
                                        'Export'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">Choose what happens to the data:</p>
                        
                        {deletionOptions.map(option => (
                            <button
                                key={option.id}
                                onClick={() => setSelectedOption(option.id)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                    selectedOption === option.id 
                                        ? option.color === 'red'
                                            ? 'border-red-500 bg-red-50'
                                            : option.color === 'blue'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-amber-500 bg-amber-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${
                                        option.color === 'red'
                                            ? 'bg-red-100 text-red-600'
                                            : option.color === 'blue'
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'bg-amber-100 text-amber-600'
                                    }`}>
                                        <option.icon size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-gray-900">{option.title}</h4>
                                            {selectedOption === option.id && (
                                                <CheckCircle2 
                                                    size={18} 
                                                    className={
                                                        option.color === 'red'
                                                            ? 'text-red-500'
                                                            : option.color === 'blue'
                                                                ? 'text-blue-500'
                                                                : 'text-amber-500'
                                                    }
                                                />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedOption === 'transfer' && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Transfer data to:
                            </label>
                            <select
                                value={transferTarget}
                                onChange={e => setTransferTarget(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select a user...</option>
                                {otherUsers.map(user => (
                                    <option key={user.uid} value={user.uid}>
                                        {user.displayName} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" fullWidth onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button 
                            variant="danger" 
                            fullWidth 
                            onClick={handleProceed}
                            disabled={selectedOption === 'transfer' && !transferTarget}
                        >
                            Continue
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-red-100 border border-red-300 rounded-xl p-5 text-center">
                        <AlertTriangle className="text-red-600 mx-auto mb-3" size={40} />
                        <h3 className="text-lg font-bold text-red-800 mb-2">Final Warning</h3>
                        <p className="text-red-700">
                            {selectedOption === 'delete-all' && 'All data will be permanently deleted.'}
                            {selectedOption === 'transfer' && `All data will be transferred to ${otherUsers.find(u => u.uid === transferTarget)?.displayName}.`}
                            {selectedOption === 'keep-shared' && 'Private data will be deleted, shared items will remain.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-red-600">{requiredConfirmText}</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            placeholder="Type confirmation text here..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" fullWidth onClick={() => setStep('options')}>
                            Back
                        </Button>
                        <Button 
                            variant="danger" 
                            fullWidth 
                            onClick={handleConfirmDeletion}
                            disabled={confirmText !== requiredConfirmText || isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={14} className="animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                'Delete Account'
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default UserDeletionModal;
