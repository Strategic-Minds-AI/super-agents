import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { X, Mail, Phone, Loader2, Inbox } from "lucide-react";

export default function StudioEnquiryDrawer({ site, onClose }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    try {
      const res = await base44.entities.WebsiteEnquiry.filter({ build_id: site.id }, { sort: "-created_date", limit: 50 });
      setEnquiries(res.items || []);
    } catch { setEnquiries([]); }
    setLoading(false);
  }, [site?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Enquiries for ${site?.title}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5E7EB] shrink-0">
          <div className="min-w-0">
            <div className="font-heading font-bold text-sm text-black truncate">{site?.title}</div>
            <div className="text-xs text-black/40">Enquiry inbox</div>
          </div>
          <button onClick={onClose} aria-label="Close enquiries" className="p-2 rounded-full hover:bg-[#FAFAFA]"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto xa-scroll px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#CCBB00]" /></div>
          ) : enquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="w-10 h-10 text-black/15" />
              <p className="text-sm text-black/40 mt-3">No enquiries yet. They'll appear here when visitors submit the contact form on your live site.</p>
            </div>
          ) : (
            enquiries.map(e => (
              <div key={e.id} className="xa-card p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-sm text-black truncate">{e.name}</span>
                  <span className="text-[10px] text-black/30 shrink-0">{new Date(e.created_date).toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-black/55">
                  <a href={`mailto:${e.email}`} className="hover:text-black hover:underline truncate">{e.email}</a>
                  {e.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {e.phone}</span>}
                </div>
                {e.message && <p className="text-xs text-black/70 mt-2 leading-relaxed whitespace-pre-wrap">{e.message}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}