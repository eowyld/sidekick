"use client";

import { useCallback, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
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

const KEY = "user_contracts";

interface ContractsData {
  templates: ContractTemplate[];
  contracts: ContractInstance[];
  signatures: ContractSignature[];
}

async function fetchContractsData(): Promise<ContractsData> {
  const supabase = createClient();
  const { data: { user } } = await getSessionUser(supabase);
  if (!user) return { templates: [], contracts: [], signatures: [] };
  const [templates, contracts, signatures] = await Promise.all([
    fetchUserContractTemplates(supabase, user.id),
    fetchUserContracts(supabase, user.id),
    fetchUserContractSignatures(supabase, user.id, { includeUrls: true })
  ]);
  return { templates, contracts, signatures };
}

export function useContractsData() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<ContractsData>(KEY, fetchContractsData, {
    fallbackData: { templates: [], contracts: [], signatures: [] }
  });

  // Re-fetch when auth state changes (login/logout)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      globalMutate(KEY);
    });
    return () => subscription.unsubscribe();
  }, [globalMutate]);

  const getUserId = useCallback(async (): Promise<string> => {
    const supabase = createClient();
    const { data: { user } } = await getSessionUser(supabase);
    if (!user) throw new Error("Non connecté");
    return user.id;
  }, []);

  const refetch = useCallback(() => {
    mutate();
  }, [mutate]);

  const addTemplate = useCallback(
    async (payload: { title: string; htmlContent: string; variableKeys: string[] }) => {
      const userId = await getUserId();
      const supabase = createClient();
      await insertContractTemplate(supabase, userId, payload);
      await mutate();
    },
    [getUserId, mutate]
  );

  const saveTemplate = useCallback(
    async (templateId: string, payload: { title: string; htmlContent: string; variableKeys: string[] }) => {
      const userId = await getUserId();
      const supabase = createClient();
      await updateContractTemplate(supabase, userId, templateId, payload);
      await mutate();
    },
    [getUserId, mutate]
  );

  const removeTemplate = useCallback(
    async (templateId: string) => {
      const userId = await getUserId();
      const supabase = createClient();
      await deleteContractTemplate(supabase, userId, templateId);
      await mutate();
    },
    [getUserId, mutate]
  );

  const createContract = useCallback(
    async (payload: { templateId: string; title: string; variables: Record<string, unknown>; htmlContent: string }) => {
      const userId = await getUserId();
      const supabase = createClient();
      const created = await insertContract(supabase, userId, payload);
      await mutate();
      return created;
    },
    [getUserId, mutate]
  );

  const removeContract = useCallback(
    async (contractId: string) => {
      const userId = await getUserId();
      const supabase = createClient();
      await deleteContract(supabase, userId, contractId);
      await mutate();
    },
    [getUserId, mutate]
  );

  const saveContract = useCallback(
    async (contractId: string, payload: { title?: string; variables?: Record<string, unknown>; htmlContent?: string; signatureId?: string | null }) => {
      const userId = await getUserId();
      const supabase = createClient();
      await updateContract(supabase, userId, contractId, payload);
      await mutate();
    },
    [getUserId, mutate]
  );

  const setContractStatus = useCallback(
    async (contractId: string, payload: { status: ContractStatus; signedAt?: string | null; sentAt?: string | null; signatureId?: string | null }) => {
      const userId = await getUserId();
      const supabase = createClient();
      await updateContractStatus(supabase, userId, contractId, payload);
      await mutate();
    },
    [getUserId, mutate]
  );

  const addSignature = useCallback(
    async (payload: { label: string; file: File; makeActive?: boolean }) => {
      const userId = await getUserId();
      const supabase = createClient();
      await uploadContractSignatureImage(supabase, userId, {
        file: payload.file,
        label: payload.label,
        makeActive: payload.makeActive ?? false
      });
      await mutate();
    },
    [getUserId, mutate]
  );

  const saveSignatureLabel = useCallback(
    async (signatureId: string, label: string) => {
      const userId = await getUserId();
      const supabase = createClient();
      await updateContractSignatureLabel(supabase, userId, signatureId, label);
      await mutate();
    },
    [getUserId, mutate]
  );

  const removeSignature = useCallback(
    async (signatureId: string) => {
      const userId = await getUserId();
      const supabase = createClient();
      await deleteContractSignature(supabase, userId, signatureId);
      await mutate();
    },
    [getUserId, mutate]
  );

  const setActiveSignatureForUser = useCallback(
    async (signatureId: string) => {
      const userId = await getUserId();
      const supabase = createClient();
      await setActiveSignature(supabase, userId, signatureId);
      await mutate();
    },
    [getUserId, mutate]
  );

  return {
    templates: data?.templates ?? [],
    contracts: data?.contracts ?? [],
    signatures: data?.signatures ?? [],
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
