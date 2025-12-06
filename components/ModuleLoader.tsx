import React from 'react';
import { Loader2 } from 'lucide-react';

interface ModuleLoaderProps {
    moduleName?: string;
}

const ModuleLoader: React.FC<ModuleLoaderProps> = ({ moduleName }) => {
    return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
            <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <p className="text-gray-500 font-medium">
                    {moduleName ? `Loading ${moduleName}...` : 'Loading module...'}
                </p>
            </div>
        </div>
    );
};

export default ModuleLoader;
