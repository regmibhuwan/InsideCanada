"use client";

import { useState, useCallback } from "react";
import { useCase } from "@/lib/use-case";
import { createClient } from "@/lib/supabase/client";
import { formatDate, documentLabel, daysUntil } from "@/lib/utils";
import { DOCUMENT_CHECKLIST } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  FolderOpen, Upload, FileText, Trash2, CheckCircle2, XCircle,
  Download, Loader2, Plus, Shield, Clock, AlertTriangle
} from "lucide-react";
import { useDropzone } from "react-dropzone";

export default function DocumentsPage() {
  const { userCase, loading, refetch } = useCase();
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState<string>("other");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length || !userCase.profile) return;
    setUploading(true);

    const supabase = createClient();
    const file = acceptedFiles[0];
    const filePath = `${userCase.profile.id}/${Date.now()}-${file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);

    await supabase.from("documents").insert({
      user_id: userCase.profile.id,
      document_type: docType,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      expiry_date: expiryDate || null,
      notes: notes || null,
    });

    setUploadOpen(false);
    setDocType("other");
    setExpiryDate("");
    setNotes("");
    await refetch();
    setUploading(false);
  }, [userCase.profile, docType, expiryDate, notes, refetch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/msword": [".doc", ".docx"],
    },
  });

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("documents").delete().eq("id", id);
    await refetch();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const prChecklist = DOCUMENT_CHECKLIST.pr_application;
  const uploadedTypes = new Set(userCase.documents.map(d => d.document_type));
  const missingDocs = prChecklist.filter(c => c.required && !uploadedTypes.has(c.type));
  const completedDocs = prChecklist.filter(c => uploadedTypes.has(c.type));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground mt-1">Securely store and track all your immigration documents.</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["passport", "work_permit", "study_permit", "ielts_result", "celpip_result",
                      "employment_letter", "pay_stub", "tax_return", "noa", "eca_report",
                      "police_clearance", "medical_exam", "photo", "birth_certificate",
                      "proof_of_funds", "reference_letter", "job_offer_letter", "lmia", "other",
                    ].map(t => (
                      <SelectItem key={t} value={t}>{documentLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (if applicable)</Label>
                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
              </div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop file here or click to browse</p>
                    <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DOC — max 10MB</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="vault">
        <TabsList>
          <TabsTrigger value="vault">
            <FolderOpen className="h-4 w-4 mr-1.5" /> My Documents ({userCase.documents.length})
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <Shield className="h-4 w-4 mr-1.5" /> PR Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vault">
          <Card>
            <CardContent className="p-6">
              {userCase.documents.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-semibold text-lg mb-2">No documents yet</h3>
                  <p className="text-muted-foreground mb-4">Upload your first document to start building your vault.</p>
                  <Button onClick={() => setUploadOpen(true)}>
                    <Upload className="h-4 w-4" /> Upload Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userCase.documents.map((doc) => {
                    const expiring = doc.expiry_date && daysUntil(doc.expiry_date) <= 90 && daysUntil(doc.expiry_date) >= 0;
                    const expired = doc.expiry_date && daysUntil(doc.expiry_date) < 0;
                    return (
                      <div key={doc.id} className={`flex items-center gap-4 p-4 rounded-lg border ${expired ? "border-red-200 bg-red-50/50" : expiring ? "border-amber-200 bg-amber-50/50" : ""}`}>
                        <FileText className="h-8 w-8 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{doc.file_name}</p>
                            <Badge variant="secondary">{documentLabel(doc.document_type)}</Badge>
                            {expired && <Badge variant="danger">Expired</Badge>}
                            {expiring && <Badge variant="warning">Expiring Soon</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded {formatDate(doc.uploaded_at)}
                            {doc.expiry_date && ` · Expires ${formatDate(doc.expiry_date)}`}
                            {doc.file_size && ` · ${(doc.file_size / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle>PR Application Document Checklist</CardTitle>
              <CardDescription>
                {completedDocs.length} of {prChecklist.length} documents uploaded · {missingDocs.length} missing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {prChecklist.map((item) => {
                const has = uploadedTypes.has(item.type);
                return (
                  <div key={item.type} className={`flex items-center gap-3 p-3 rounded-lg ${has ? "bg-green-50/50" : "bg-muted/50"}`}>
                    {has ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className={`text-sm ${has ? "text-green-800" : ""}`}>{item.label}</span>
                      {item.required && !has && (
                        <span className="text-xs text-red-500 ml-2">Required</span>
                      )}
                    </div>
                    {!has && (
                      <Button variant="ghost" size="sm" onClick={() => { setDocType(item.type); setUploadOpen(true); }}>
                        <Upload className="h-3 w-3 mr-1" /> Upload
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
