import React from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import StudioBuilder from '@/components/studio/StudioBuilder';
export default function StudioCreateDialog({studio}) {
 return <Dialog open={studio.create} onOpenChange={studio.setCreate}><DialogContent className="studio-surface max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Create a Website</DialogTitle><DialogDescription>Build a private draft, customize it visually and publish when it is ready.</DialogDescription></DialogHeader><StudioBuilder onBuilt={id=>{studio.setCreate(false);studio.refresh();studio.open(id);}}/></DialogContent></Dialog>;
}