import { useQueryClient } from "@tanstack/react-query";
import {
  useAddDomain as useAddDomainGenerated,
  useVerifyDomain as useVerifyDomainGenerated,
  useRemoveDomain as useRemoveDomainGenerated,
  getListDomainsQueryKey,
} from "./generated/api";

export interface DnsInstructions {
  aRecord: { type: string; host: string; value: string };
  cnameRecord: { type: string; host: string; value: string };
  txtRecord: { type: string; host: string; value: string };
}

export interface DomainVerifyResponse {
  id: string;
  projectId: string;
  domain: string;
  status: string;
  dnsVerified: boolean;
  sslIssued: boolean;
  sslExpiresAt: string | null;
  verificationToken: string | null;
  createdAt: string;
  updatedAt: string;
  dnsRecords: { type: string; value: string }[];
  dnsInstructions: DnsInstructions;
}

export function useAddDomainWithInvalidation() {
  const queryClient = useQueryClient();
  const mutation = useAddDomainGenerated({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListDomainsQueryKey(variables.projectId) });
      },
    },
  });

  return {
    ...mutation,
    mutateAsync: async ({ projectId, domain }: { projectId: string; domain: string }) => {
      return mutation.mutateAsync({ projectId, data: { domain } });
    },
  };
}

export function useVerifyDomainWithInvalidation() {
  const queryClient = useQueryClient();
  return useVerifyDomainGenerated({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListDomainsQueryKey(variables.projectId) });
      },
    },
  });
}

export function useRemoveDomainWithInvalidation() {
  const queryClient = useQueryClient();
  return useRemoveDomainGenerated({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListDomainsQueryKey(variables.projectId) });
      },
    },
  });
}
