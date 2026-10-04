import React from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import StudioInboxPanel from '@/components/studio/StudioInboxPanel';
export default function StudioInboxDialog({site,open,onOpenChange}) {
 if(!site)return null;
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="studio-surface max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{site.title} — Enquiries</DialogTitle><DialogDescription>Messages submitted through your published website.</DialogDescription></DialogHeader><StudioInboxPanel site={site}/></DialogContent></Dialog>;
}