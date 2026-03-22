/**
 * Drive-like persistance (Supabase) pour le module « Mes contrats ».
 * Chaque utilisateur ne voit que ses propres templates/contrats/signatures (RLS).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  uploadDriveFileToPath,
  DRIVE_BUCKET
} from "./drive-db";

// Types

export type ContractStatus = "draft" | "sent" | "signed";

export interface ContractTemplate {
  id: string;
  title: string;
  htmlContent: string;
  variableKeys: string[];
  updatedAt?: string;
  createdAt?: string;
}

export interface ContractInstance {
  id: string;
  templateId: string;
  title: string;
  variables: Record<string, unknown>;
  htmlContent: string;
  status: ContractStatus;
  statusUpdatedAt: string;
  sentAt?: string | null;
  signedAt?: string | null;
  signatureId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractSignature {
  id: string;
  label: string;
  storagePath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // URL résolue côté client (public bucket) optionnelle
  url?: string;
}

// Rows (DB)

interface ContractTemplateRow {
  id: string;
  user_id: string;
  title: string;
  html_content: string;
  variable_keys: string[]; // jsonb
  created_at: string;
  updated_at: string;
}

interface ContractRow {
  id: string;
  user_id: string;
  template_id: string;
  title: string;
  variables: Record<string, unknown>;
  html_content: string;
  status: ContractStatus;
  status_updated_at: string;
  sent_at: string | null;
  signed_at: string | null;
  signature_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SignatureRow {
  id: string;
  user_id: string;
  label: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function rowToTemplate(row: ContractTemplateRow): ContractTemplate {
  return {
    id: row.id,
    title: row.title,
    htmlContent: row.html_content,
    variableKeys: (row.variable_keys ?? []) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToContract(row: ContractRow): ContractInstance {
  return {
    id: row.id,
    templateId: row.template_id,
    title: row.title,
    variables: row.variables ?? {},
    htmlContent: row.html_content ?? "",
    status: row.status,
    statusUpdatedAt: row.status_updated_at,
    sentAt: row.sent_at,
    signedAt: row.signed_at,
    signatureId: row.signature_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToSignature(row: SignatureRow, resolvedUrl?: string): ContractSignature {
  return {
    id: row.id,
    label: row.label,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    url: resolvedUrl
  };
}

// CRUD templates

export async function fetchUserContractTemplates(
  supabase: SupabaseClient,
  userId: string
): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => rowToTemplate(r as unknown as ContractTemplateRow));
}

export async function insertContractTemplate(
  supabase: SupabaseClient,
  userId: string,
  payload: { title: string; htmlContent: string; variableKeys: string[] }
): Promise<ContractTemplate> {
  const { data, error } = await supabase
    .from("contract_templates")
    .insert({
      user_id: userId,
      title: payload.title,
      html_content: payload.htmlContent,
      variable_keys: payload.variableKeys
    })
    .select()
    .single();

  if (error) throw error;
  return rowToTemplate(data as unknown as ContractTemplateRow);
}

export async function updateContractTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
  payload: { title: string; htmlContent: string; variableKeys: string[] }
): Promise<ContractTemplate> {
  const { data, error } = await supabase
    .from("contract_templates")
    .update({
      title: payload.title,
      html_content: payload.htmlContent,
      variable_keys: payload.variableKeys,
      updated_at: new Date().toISOString()
    })
    .eq("id", templateId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return rowToTemplate(data as unknown as ContractTemplateRow);
}

export async function deleteContractTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string
): Promise<void> {
  const { error } = await supabase
    .from("contract_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);

  if (error) throw error;
}

// CRUD contracts (instances)

export async function fetchUserContracts(
  supabase: SupabaseClient,
  userId: string
): Promise<ContractInstance[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => rowToContract(r as unknown as ContractRow));
}

export async function insertContract(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    templateId: string;
    title: string;
    variables: Record<string, unknown>;
    htmlContent: string;
  }
): Promise<ContractInstance> {
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      user_id: userId,
      template_id: payload.templateId,
      title: payload.title,
      variables: payload.variables,
      html_content: payload.htmlContent,
      status: "draft",
      status_updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return rowToContract(data as unknown as ContractRow);
}

export async function deleteContract(
  supabase: SupabaseClient,
  userId: string,
  contractId: string
): Promise<void> {
  const { error } = await supabase
    .from("contracts")
    .delete()
    .eq("id", contractId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateContract(
  supabase: SupabaseClient,
  userId: string,
  contractId: string,
  payload: {
    title?: string;
    variables?: Record<string, unknown>;
    htmlContent?: string;
    signatureId?: string | null;
  }
): Promise<ContractInstance> {
  const payloadDb: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.title !== undefined) payloadDb.title = payload.title;
  if (payload.variables !== undefined) payloadDb.variables = payload.variables;
  if (payload.htmlContent !== undefined) payloadDb.html_content = payload.htmlContent;
  if (payload.signatureId !== undefined) payloadDb.signature_id = payload.signatureId;

  const { data, error } = await supabase
    .from("contracts")
    .update(payloadDb)
    .eq("id", contractId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return rowToContract(data as unknown as ContractRow);
}

export async function updateContractStatus(
  supabase: SupabaseClient,
  userId: string,
  contractId: string,
  payload: { status: ContractStatus; signedAt?: string | null; sentAt?: string | null; signatureId?: string | null }
): Promise<ContractInstance> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: payload.status,
    status_updated_at: now,
    updated_at: now
  };

  if (payload.status === "draft") {
    patch.sent_at = null;
    patch.signed_at = null;
    patch.signature_id = payload.signatureId ?? null;
  }
  if (payload.status === "sent") {
    patch.sent_at = payload.sentAt ?? now;
  }
  if (payload.status === "signed") {
    patch.signed_at = payload.signedAt ?? now;
    patch.signature_id = payload.signatureId ?? null;
  }

  const { data, error } = await supabase
    .from("contracts")
    .update(patch)
    .eq("id", contractId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return rowToContract(data as unknown as ContractRow);
}

// Signatures

export async function fetchUserContractSignatures(
  supabase: SupabaseClient,
  userId: string,
  opts?: { includeUrls?: boolean }
): Promise<ContractSignature[]> {
  const { data, error } = await supabase
    .from("user_contract_signatures")
    .select("*")
    .eq("user_id", userId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as SignatureRow[];
  if (!opts?.includeUrls) {
    return rows.map((r) => rowToSignature(r));
  }

  // Bucket public → URL publique.
  return await Promise.all(
    rows.map(async (r) => {
      const { data: urlData } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(r.storage_path);
      return rowToSignature(r, urlData.publicUrl);
    })
  );
}

export async function setActiveSignature(
  supabase: SupabaseClient,
  userId: string,
  signatureId: string
): Promise<void> {
  // Deux étapes : supprimer l’actif puis activer la sélection.
  const { error: offError } = await supabase
    .from("user_contract_signatures")
    .update({ is_active: false })
    .eq("user_id", userId);
  if (offError) throw offError;

  const { error: onError } = await supabase
    .from("user_contract_signatures")
    .update({ is_active: true })
    .eq("id", signatureId)
    .eq("user_id", userId);
  if (onError) throw onError;
}

export async function insertContractSignatureRecord(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    id: string;
    label: string;
    storagePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    isActive?: boolean;
  }
): Promise<ContractSignature> {
  const { data, error } = await supabase
    .from("user_contract_signatures")
    .insert({
      id: payload.id,
      user_id: userId,
      label: payload.label,
      storage_path: payload.storagePath,
      mime_type: payload.mimeType ?? null,
      file_size_bytes: payload.fileSizeBytes ?? null,
      is_active: payload.isActive ?? false,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(payload.storagePath);
  return rowToSignature(data as unknown as SignatureRow, urlData.publicUrl);
}

export async function uploadContractSignatureImage(
  supabase: SupabaseClient,
  userId: string,
  payload: { file: File; label: string; makeActive?: boolean }
): Promise<ContractSignature> {
  const id = crypto.randomUUID();
  const pngFile = new File([payload.file], `${id}.png`, { type: payload.file.type || "image/png" });

  // Stock dans drive : drive/{userId}/contracts-signatures/{id}.png
  const { path, url } = await uploadDriveFileToPath(
    supabase,
    userId,
    pngFile,
    `contracts-signatures`
  );

  // Si on veut le rendre actif, on l’assigne directement (l’unicité est assurée côté index partiel).
  if (payload.makeActive) {
    // On n’assume pas que l’index partiel autorise direct insert true si d’autres sont actifs,
    // donc on "désactive tout" avant.
    await setActiveSignature(supabase, userId, id).catch(() => {
      // Si l’activation échoue (pas encore inséré), on retentera après insert.
    });
  }

  return await insertContractSignatureRecord(supabase, userId, {
    id,
    label: payload.label,
    storagePath: path,
    mimeType: pngFile.type,
    fileSizeBytes: pngFile.size,
    isActive: payload.makeActive ?? false
  });
}

export async function deleteContractSignature(
  supabase: SupabaseClient,
  userId: string,
  signatureId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_contract_signatures")
    .delete()
    .eq("id", signatureId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateContractSignatureLabel(
  supabase: SupabaseClient,
  userId: string,
  signatureId: string,
  label: string
): Promise<ContractSignature> {
  const { data, error } = await supabase
    .from("user_contract_signatures")
    .update({ label, updated_at: new Date().toISOString() })
    .eq("id", signatureId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(DRIVE_BUCKET)
    .getPublicUrl((data as SignatureRow).storage_path);

  return rowToSignature(data as unknown as SignatureRow, urlData.publicUrl);
}

