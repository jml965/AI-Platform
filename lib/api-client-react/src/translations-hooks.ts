import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface SupportedLanguage {
  code: string;
  name: string;
  nameAr: string;
  rtl: boolean;
}

export interface ProjectLanguage {
  id: string;
  projectId: string;
  languageCode: string;
  languageName: string;
  isDefault: number;
  isRtl: number;
  createdAt: string;
}

export interface Translation {
  id: string;
  projectId: string;
  languageCode: string;
  contentKey: string;
  sourceText: string;
  translatedText: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function useSupportedLanguages() {
  return useQuery<{ data: SupportedLanguage[] }>({
    queryKey: ["supportedLanguages"],
    queryFn: () =>
      customFetch(`${API_BASE}/translations/languages`, {
        credentials: "include",
      }),
  });
}

export function useProjectLanguages(projectId: string | undefined) {
  return useQuery<{ data: ProjectLanguage[] }>({
    queryKey: ["projectLanguages", projectId],
    queryFn: () =>
      customFetch(`${API_BASE}/projects/${projectId}/languages`, {
        credentials: "include",
      }),
    enabled: !!projectId,
  });
}

export function useAddProjectLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      languageCode,
      languageName,
      isDefault,
      isRtl,
    }: {
      projectId: string;
      languageCode: string;
      languageName: string;
      isDefault?: boolean;
      isRtl?: boolean;
    }) =>
      customFetch<{ data: ProjectLanguage }>(`${API_BASE}/projects/${projectId}/languages`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ languageCode, languageName, isDefault, isRtl }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectLanguages", variables.projectId] });
    },
  });
}

export function useRemoveProjectLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, languageCode }: { projectId: string; languageCode: string }) =>
      customFetch(`${API_BASE}/projects/${projectId}/languages/${languageCode}`, {
        method: "DELETE",
        credentials: "include",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectLanguages", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["translations", variables.projectId] });
    },
  });
}

export function useProjectTranslations(projectId: string | undefined, languageCode: string | undefined) {
  return useQuery<{ data: Translation[] }>({
    queryKey: ["translations", projectId, languageCode],
    queryFn: () =>
      customFetch(`${API_BASE}/projects/${projectId}/translations/${languageCode}`, {
        credentials: "include",
      }),
    enabled: !!projectId && !!languageCode,
  });
}

export function useUpdateTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      translationId,
      translatedText,
    }: {
      projectId: string;
      translationId: string;
      translatedText: string;
    }) =>
      customFetch<{ data: Translation }>(`${API_BASE}/projects/${projectId}/translations/${translationId}`, {
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ translatedText }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["translations", variables.projectId] });
    },
  });
}

export function useTranslateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, languageCode }: { projectId: string; languageCode: string }) =>
      customFetch<{ data: Translation[]; count: number }>(
        `${API_BASE}/projects/${projectId}/translate/${languageCode}`,
        {
          method: "POST",
          credentials: "include",
        }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["translations", variables.projectId] });
    },
  });
}
