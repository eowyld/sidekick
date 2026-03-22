"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  type ContractInstance,
  type ContractSignature,
  type ContractStatus,
  type ContractTemplate,
  fetchUserContractTemplates,
  fetchUserContracts,
  fetchUserContractSignatures,
  insertContractTemplate,
  insertContract,
  updateContractTemplate,
  updateContract,
  updateContractStatus,
  deleteContractTemplate,
  deleteContract,
  setActiveSignature,
  uploadContractSignatureImage,
  deleteContractSignature,
  updateContractSignatureLabel
} from "@/lib/contracts-db";

export function useContractsData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contracts, setContracts] = useState<ContractInstance[]>([]);
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (uid: string | null) => {
      if (!uid) {
        setTemplates([]);
        setContracts([]);
        setSignatures([]);
        setIsLoading(false);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      const supabase = createClient();
      try {
        const [t, c, s] = await Promise.all([
          fetchUserContractTemplates(supabase, uid),
          fetchUserContracts(supabase, uid),
          fetchUserContractSignatures(supabase, uid, { includeUrls: true })
        ]);
        setTemplates(t);
        setContracts(c);
        setSignatures(s);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setTemplates([]);
        setContracts([]);
        setSignatures([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const id = user?.id ?? null;
      setUserId(id);
      load(id);
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      load(id);
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const refetch = useCallback(() => {
    load(userId);
  }, [userId, load]);

  const addTemplate = useCallback(
    async (payload: { title: string; htmlContent: string; variableKeys: string[] }) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await insertContractTemplate(supabase, userId, payload);
      await load(userId);
    },
    [userId, load]
  );

  const saveTemplate = useCallback(
    async (templateId: string, payload: { title: string; htmlContent: string; variableKeys: string[] }) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await updateContractTemplate(supabase, userId, templateId, payload);
      await load(userId);
    },
    [userId, load]
  );

  const removeTemplate = useCallback(
    async (templateId: string) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await deleteContractTemplate(supabase, userId, templateId);
      await load(userId);
    },
    [userId, load]
  );

  const createContract = useCallback(
    async (payload: { templateId: string; title: string; variables: Record<string, unknown>; htmlContent: string }) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      const created = await insertContract(supabase, userId, payload);
      await load(userId);
      return created;
    },
    [userId, load]
  );

  const removeContract = useCallback(
    async (contractId: string) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await deleteContract(supabase, userId, contractId);
      await load(userId);
    },
    [userId, load]
  );

  const saveContract = useCallback(
    async (contractId: string, payload: { title?: string; variables?: Record<string, unknown>; htmlContent?: string; signatureId?: string | null }) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await updateContract(supabase, userId, contractId, payload);
      await load(userId);
    },
    [userId, load]
  );

  const setContractStatus = useCallback(
    async (contractId: string, payload: { status: ContractStatus; signedAt?: string | null; sentAt?: string | null; signatureId?: string | null }) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await updateContractStatus(supabase, userId, contractId, payload);
      await load(userId);
    },
    [userId, load]
  );

  const addSignature = useCallback(
    async (payload: { label: string; file: File; makeActive?: boolean }) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await uploadContractSignatureImage(supabase, userId, {
        file: payload.file,
        label: payload.label,
        makeActive: payload.makeActive ?? false
      });
      await load(userId);
    },
    [userId, load]
  );

  const saveSignatureLabel = useCallback(
    async (signatureId: string, label: string) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await updateContractSignatureLabel(supabase, userId, signatureId, label);
      await load(userId);
    },
    [userId, load]
  );

  const removeSignature = useCallback(
    async (signatureId: string) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await deleteContractSignature(supabase, userId, signatureId);
      await load(userId);
    },
    [userId, load]
  );

  const setActiveSignatureForUser = useCallback(
    async (signatureId: string) => {
      if (!userId) throw new Error("Non connecté");
      const supabase = createClient();
      await setActiveSignature(supabase, userId, signatureId);
      await load(userId);
    },
    [userId, load]
  );

  return {
    userId,
    templates,
    contracts,
    signatures,
    isLoading,
    error,
    refetch,
    addTemplate,
    saveTemplate,
    removeTemplate,
    createContract,
    removeContract,
    saveContract,
    setContractStatus,
    addSignature,
    saveSignatureLabel,
    removeSignature,
    setActiveSignatureForUser
  };
}

