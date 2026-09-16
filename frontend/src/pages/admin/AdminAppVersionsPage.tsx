import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui";
import {
  adminService,
  AdminAppVersion,
  AdminUpdateAppVersionRequest,
} from "../../services/adminService";
import { API_BASE_URL } from "../../services/config";

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return format(new Date(value), "MMM d, yyyy HH:mm");
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function buildDownloadUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, "")}${url}`;
}

function encodeBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export default function AdminAppVersionsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [isLatest, setIsLatest] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-app-versions"],
    queryFn: async () => {
      const response = await adminService.getAppVersions();
      return response.data.versions;
    },
  });

  const versions = data || [];
  const selectedVersion = useMemo<AdminAppVersion | null>(() => {
    if (versions.length === 0) return null;
    return (
      versions.find((version) => version.id === selectedId) ||
      versions.find((version) => version.is_latest) ||
      versions[0]
    );
  }, [selectedId, versions]);

  useEffect(() => {
    if (!selectedVersion) return;
    setSelectedId(selectedVersion.id);
    setReleaseNotes(selectedVersion.release_notes || "");
    setIsMandatory(selectedVersion.is_mandatory);
    setIsLatest(selectedVersion.is_latest);
  }, [selectedVersion]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await adminService.syncAppVersions();
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-app-versions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: AdminUpdateAppVersionRequest;
    }) => {
      const response = await adminService.updateAppVersion(id, payload);
      return response.data;
    },
    onSuccess: (updatedVersion) => {
      queryClient.setQueryData(
        ["admin-app-versions"],
        (existing: AdminAppVersion[] | undefined) =>
          (existing || []).map((version) =>
            version.id === updatedVersion.id
              ? updatedVersion
              : {
                  ...version,
                  is_latest: updatedVersion.is_latest
                    ? false
                    : version.is_latest,
                },
          ),
      );
    },
  });

  const isDirty =
    Boolean(selectedVersion) &&
    (releaseNotes !== (selectedVersion?.release_notes || "") ||
      isMandatory !== selectedVersion?.is_mandatory ||
      isLatest !== selectedVersion?.is_latest);

  const handleSave = () => {
    if (!selectedVersion) return;

    void updateMutation.mutateAsync({
      id: selectedVersion.id,
      payload: {
        release_notes_base64: encodeBase64Utf8(releaseNotes),
        is_mandatory: isMandatory,
        is_latest: isLatest,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">App Versions</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage synced desktop releases, release notes, download assets,
              and mandatory update flags.
            </p>
          </div>
          <Button
            onClick={() => void syncMutation.mutateAsync()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? "Syncing..." : "Sync GitHub Releases"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading app versions...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-8 text-center text-red-600 shadow-sm ring-1 ring-gray-100">
          Failed to load app versions.
        </div>
      ) : versions.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-gray-100">
          No app versions are synced yet. Run GitHub sync to populate this
          table.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Versions
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {versions.length}
              </span>
            </div>
            <div className="space-y-2">
              {versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => setSelectedId(version.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    selectedVersion?.id === version.id
                      ? "border-primary-300 bg-primary-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        v{version.version}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(version.release_date)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {version.is_latest && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Latest
                        </span>
                      )}
                      {version.is_mandatory && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                          Mandatory
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedVersion && (
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    v{selectedVersion.version}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Synced {formatDate(selectedVersion.last_synced_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedVersion.github_url && (
                    <a
                      href={selectedVersion.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      GitHub Release
                    </a>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={!isDirty || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Latest Version
                    </span>
                    <span className="block text-xs text-slate-500">
                      Electron clients compare against this version.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isLatest}
                    onChange={(event) => setIsLatest(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Mandatory Update
                    </span>
                    <span className="block text-xs text-slate-500">
                      Blocks app usage until users update.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={(event) => setIsMandatory(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Release Date
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {formatDate(selectedVersion.release_date)}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Release Notes
                </label>
                <textarea
                  value={releaseNotes}
                  onChange={(event) => setReleaseNotes(event.target.value)}
                  className="min-h-[260px] w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  This content is what Electron users see in the update modal.
                  GitHub sync will not overwrite admin-edited notes for existing
                  versions.
                </p>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Download Assets
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                          File
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                          Size
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                          Link
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedVersion.assets.map((asset) => (
                        <tr key={asset.id}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {asset.name}
                            <div className="text-xs text-slate-500">
                              {asset.content_type || "application/octet-stream"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {formatBytes(asset.size)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <a
                              href={buildDownloadUrl(asset.download_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-primary-600 hover:text-primary-700"
                            >
                              Download
                            </a>
                          </td>
                        </tr>
                      ))}
                      {selectedVersion.assets.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-6 text-center text-sm text-slate-500"
                          >
                            No assets synced for this version.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
