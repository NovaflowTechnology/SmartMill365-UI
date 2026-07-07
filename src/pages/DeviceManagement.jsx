import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  Trash2,
  X,
} from "lucide-react";

const emptyForm = {
  org_id: "",
  bucket_name: "Mill",
  measurement_name: "PBLR",
  tag_key: "id",
  tag_value: "",
  device_name: "",
};

const API_BASE_URL = "http://localhost:5000";

export default function DeviceManagement({ setPage, dark = false }) {
  const role = localStorage.getItem("role");

  const panelClass = dark
    ? "border-slate-700 bg-slate-900 text-slate-100 shadow-black/30"
    : "border-gray-200 bg-white text-gray-900";

  const inputClass = dark
    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
    : "border-gray-300 bg-white text-gray-900";

  const mutedPanelClass = dark
    ? "border-slate-700 bg-slate-950/70"
    : "border-gray-200 bg-gray-50/80";
  const [organizations, setOrganizations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  // Live metadata used while a superadmin registers a device.
  const [availableBuckets, setAvailableBuckets] = useState([]);
  const [availableMeasurements, setAvailableMeasurements] = useState([]);
  const [availableIds, setAvailableIds] = useState([]);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState("");

  const getAuthHeaders = (json = false) => {
    const token = localStorage.getItem("token");

    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      Authorization: token,
    };
  };

  const readError = async (response, fallbackMessage) => {
    try {
      const payload = await response.json();
      return payload?.error || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const loadPageData = async () => {
    setLoading(true);
    setError("");

    try {
      const [orgResponse, deviceResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/organizations`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE_URL}/organization-influx-devices`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!orgResponse.ok) {
        throw new Error(
          await readError(orgResponse, "Failed to load organizations."),
        );
      }

      if (!deviceResponse.ok) {
        throw new Error(
          await readError(deviceResponse, "Failed to load assigned devices."),
        );
      }

      const [organizationData, deviceData] = await Promise.all([
        orgResponse.json(),
        deviceResponse.json(),
      ]);

      setOrganizations(Array.isArray(organizationData) ? organizationData : []);

      setDevices(Array.isArray(deviceData) ? deviceData : []);
    } catch (requestError) {
      console.error("❌ Device management load error:", requestError);
      setError(requestError.message || "Failed to load device assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "superadmin") {
      loadPageData();
    } else {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (!error && !notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError("");
      setNotice("");
    }, error ? 6000 : 3500);

    return () => window.clearTimeout(timer);
  }, [error, notice]);

  useEffect(() => {
    if (!showForm) return;

    const loadBuckets = async () => {
      setMetadataLoading(true);
      setMetadataError("");

      try {
        setAvailableBuckets(await fetchInfluxBuckets());
      } catch (requestError) {
        console.error("❌ Influx bucket load error:", requestError);
        setMetadataError(
          requestError.message || "Failed to load Influx buckets.",
        );
      } finally {
        setMetadataLoading(false);
      }
    };

    loadBuckets();
  }, [showForm]);

  useEffect(() => {
    if (!showForm || !form.bucket_name.trim()) return;

    const loadMeasurements = async () => {
      setMetadataLoading(true);
      setMetadataError("");

      try {
        setAvailableMeasurements(
          await fetchInfluxMeasurements(form.bucket_name.trim()),
        );
      } catch (requestError) {
        console.error("❌ Influx measurement load error:", requestError);
        setMetadataError(
          requestError.message || "Failed to load Influx measurements.",
        );
        setAvailableMeasurements([]);
      } finally {
        setMetadataLoading(false);
      }
    };

    loadMeasurements();
  }, [showForm, form.bucket_name]);

  useEffect(() => {
    if (
      !showForm ||
      !form.bucket_name.trim() ||
      !form.measurement_name.trim() ||
      !form.tag_key.trim()
    ) {
      setAvailableIds([]);
      setAvailableChannels([]);
      return;
    }

    const loadDeviceMetadata = async () => {
      setMetadataLoading(true);
      setMetadataError("");

      try {
        const { ids, channels } = await fetchInfluxDeviceMetadata(
          form.bucket_name.trim(),
          form.measurement_name.trim(),
          form.tag_key.trim(),
        );

        setAvailableIds(ids);
        setAvailableChannels(channels);
      } catch (requestError) {
        console.error("❌ Influx device metadata load error:", requestError);
        setMetadataError(
          requestError.message || "Failed to load Influx device metadata.",
        );
        setAvailableIds([]);
        setAvailableChannels([]);
      } finally {
        setMetadataLoading(false);
      }
    };

    loadDeviceMetadata();
  }, [showForm, form.bucket_name, form.measurement_name, form.tag_key]);

  const filteredDevices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesOrganization =
        !selectedOrgId || String(device.org_id) === String(selectedOrgId);

      if (!matchesOrganization) return false;
      if (!keyword) return true;

      return [
        device.org_name,
        device.device_name,
        device.bucket_name,
        device.measurement_name,
        device.tag_key,
        device.tag_value,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [devices, search, selectedOrgId]);

  const updateForm = (field, value) => {
    setForm((current) => {
      if (field === "bucket_name") {
        return {
          ...current,
          bucket_name: value,
          measurement_name: "",
          tag_value: "",
        };
      }

      if (field === "measurement_name" || field === "tag_key") {
        return {
          ...current,
          [field]: value,
          tag_value: "",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const fetchInfluxBuckets = async () => {
    const response = await fetch(`${API_BASE_URL}/influx/buckets`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        await readError(response, "Failed to load Influx buckets."),
      );
    }

    const payload = await response.json();
    return Array.isArray(payload?.buckets) ? payload.buckets : [];
  };

  const fetchInfluxMeasurements = async (selectedBucket) => {
    const response = await fetch(
      `${API_BASE_URL}/influx/measurements?bucket=${encodeURIComponent(selectedBucket)}`,
      { headers: getAuthHeaders() },
    );

    if (!response.ok) {
      throw new Error(
        await readError(response, "Failed to load Influx measurements."),
      );
    }

    const payload = await response.json();
    return Array.isArray(payload?.measurements) ? payload.measurements : [];
  };

  const fetchInfluxDeviceMetadata = async (
    selectedBucket,
    selectedMeasurement,
    selectedTagKey,
  ) => {
    const query = new URLSearchParams({
      bucket: selectedBucket,
      measurement: selectedMeasurement,
      tagKey: selectedTagKey || "id",
    });

    const [idsResponse, channelsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/influx/ids?${query.toString()}`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${API_BASE_URL}/influx/channels?${query.toString()}`, {
        headers: getAuthHeaders(),
      }),
    ]);

    if (!idsResponse.ok) {
      throw new Error(
        await readError(idsResponse, "Failed to load Influx device IDs."),
      );
    }

    if (!channelsResponse.ok) {
      throw new Error(
        await readError(channelsResponse, "Failed to load Influx channels."),
      );
    }

    const [idsPayload, channelsPayload] = await Promise.all([
      idsResponse.json(),
      channelsResponse.json(),
    ]);

    return {
      ids: Array.isArray(idsPayload?.ids) ? idsPayload.ids : [],
      channels: Array.isArray(channelsPayload?.channels)
        ? channelsPayload.channels
        : [],
    };
  };

  const refreshInfluxMetadata = async () => {
    setMetadataLoading(true);
    setMetadataError("");

    try {
      const buckets = await fetchInfluxBuckets();
      setAvailableBuckets(buckets);

      const selectedBucket = form.bucket_name.trim();
      const selectedMeasurement = form.measurement_name.trim();
      const selectedTagKey = form.tag_key.trim() || "id";

      if (!selectedBucket) {
        setAvailableMeasurements([]);
        setAvailableIds([]);
        setAvailableChannels([]);
        return;
      }

      const measurements = await fetchInfluxMeasurements(selectedBucket);
      setAvailableMeasurements(measurements);

      if (!selectedMeasurement) {
        setAvailableIds([]);
        setAvailableChannels([]);
        return;
      }

      const { ids, channels } = await fetchInfluxDeviceMetadata(
        selectedBucket,
        selectedMeasurement,
        selectedTagKey,
      );

      setAvailableIds(ids);
      setAvailableChannels(channels);
    } catch (requestError) {
      console.error("❌ Device metadata load error:", requestError);
      setMetadataError(
        requestError.message || "Failed to load Influx metadata.",
      );
      setAvailableMeasurements([]);
      setAvailableIds([]);
      setAvailableChannels([]);
    } finally {
      setMetadataLoading(false);
    }
  };

  const openCreateForm = () => {
    setError("");
    setNotice("");
    setMetadataError("");
    setAvailableMeasurements([]);
    setAvailableIds([]);
    setAvailableChannels([]);
    setForm({
      ...emptyForm,
      org_id: selectedOrgId || "",
    });
    setShowForm(true);
  };

  const closeCreateForm = () => {
    if (saving) return;

    setShowForm(false);
    setError("");
    setForm(emptyForm);
  };

  const submitDevice = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = {
      org_id: Number(form.org_id),
      bucket_name: form.bucket_name.trim(),
      measurement_name: form.measurement_name.trim(),
      tag_key: form.tag_key.trim(),
      tag_value: form.tag_value.trim(),
      device_name: form.device_name.trim(),
    };

    if (
      !payload.org_id ||
      !payload.bucket_name ||
      !payload.measurement_name ||
      !payload.tag_key ||
      !payload.tag_value
    ) {
      setError(
        "Organization, bucket, measurement, tag key, and tag value are required.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/organization-influx-devices`,
        {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response, "Failed to assign Influx device."),
        );
      }

      setShowForm(false);
      setForm(emptyForm);
      setNotice("Device assigned to organization successfully.");
      await loadPageData();
    } catch (requestError) {
      console.error("❌ Create device assignment error:", requestError);
      setError(requestError.message || "Failed to assign Influx device.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDevice = async (device) => {
    setDeletingId(device.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/organization-influx-devices/${device.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response, "Failed to remove device assignment."),
        );
      }

      setDevices((current) =>
        current.filter((item) => item.id !== device.id),
      );
      setPendingDelete(null);
      setNotice("Device assignment removed.");
    } catch (requestError) {
      console.error("❌ Delete device assignment error:", requestError);
      setError(requestError.message || "Failed to remove device assignment.");
    } finally {
      setDeletingId(null);
    }
  };

  if (role !== "superadmin") {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6 dark:bg-gray-900">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-900 dark:bg-gray-800">
          <ServerCog className="mx-auto mb-4 text-red-500" size={38} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Superadmin access required
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Only superadmins can register and assign industrial Influx devices
            to organizations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`device-management-page min-h-full w-full overflow-auto p-6 ${
        dark ? "device-management-dark bg-[#050a1e]" : "bg-transparent"
      }`}
    >
      {dark && (
        <style>{`
          .device-management-dark {
            color: #e2e8f0;
          }

          .device-management-dark .text-gray-900,
          .device-management-dark .text-gray-800,
          .device-management-dark .text-gray-700 {
            color: #f8fafc !important;
          }

          .device-management-dark .text-gray-600,
          .device-management-dark .text-gray-500 {
            color: #cbd5e1 !important;
          }

          .device-management-dark .text-gray-400,
          .device-management-dark .text-gray-300 {
            color: #94a3b8 !important;
          }

          .device-management-dark input,
          .device-management-dark select,
          .device-management-dark textarea {
            color: #f8fafc !important;
            background-color: #020617 !important;
            border-color: #334155 !important;
          }

          .device-management-dark input::placeholder {
            color: #64748b !important;
          }

          .device-management-dark option {
            color: #f8fafc !important;
            background-color: #020617 !important;
          }

          .device-management-dark thead {
            color: #bfdbfe !important;
          }

          .device-management-dark tbody tr {
            color: #e2e8f0 !important;
          }
        `}</style>
      )}
      <div className="relative z-10 w-full">
        <div
          className={`sticky top-0 z-20 rounded-3xl border p-6 shadow-lg backdrop-blur-xl ${
            dark
              ? "border-slate-700 bg-slate-900/95 shadow-black/30"
              : "border-gray-200 bg-white/85"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  <ServerCog size={22} />
                </div>
                <div>
                  <h1 className={dark ? "text-3xl font-bold text-slate-50" : "text-3xl font-bold text-gray-900"}>
                    Device Management
                  </h1>
                  <p className={dark ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-gray-500"}>
                    Register Influx devices and control which organization can
                    use them.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadPageData}
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  dark
                    ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 hover:-translate-y-0.5"
              >
                <Plus size={18} />
                Assign Device
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_260px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search organization, device, bucket, measurement, or tag value..."
                className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
              />
            </div>

            <select
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              className={`rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
            >
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
        </div>


        <div
          className={`relative z-10 mt-6 overflow-hidden rounded-3xl border shadow-lg ${panelClass}`}
        >
          <div
            className={`flex items-center justify-between border-b px-6 py-5 ${
              dark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"
            }`}
          >
            <div>
              <h2 className={dark ? "font-bold text-slate-50" : "font-bold text-gray-900"}>
                Organization Device Assignments
              </h2>
              <p className={dark ? "mt-1 text-xs text-slate-300" : "mt-1 text-xs text-gray-500"}>
                {filteredDevices.length} device assignment(s) shown
              </p>
            </div>
            <Database className="text-blue-500" size={22} />
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <RefreshCw className="mr-3 animate-spin" size={18} />
              Loading devices...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <ServerCog
                size={34}
                className="text-gray-300 dark:text-gray-600"
              />
              <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
                No device assignments found
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Register an Influx device and assign it to an organization
                before its admins can use it in Template Builder.
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Assign First Device
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead
                  className={`text-xs uppercase tracking-wider ${
                    dark
                      ? "bg-slate-950 text-sky-200"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  <tr>
                    <th className="px-6 py-4 font-semibold">Organization</th>
                    <th className="px-6 py-4 font-semibold">Device</th>
                    <th className="px-6 py-4 font-semibold">Influx source</th>
                    <th className="px-6 py-4 font-semibold">Tag</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={dark ? "divide-y divide-slate-800 bg-slate-900" : "divide-y divide-gray-100 bg-white"}
                >
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      className={dark ? "transition hover:bg-slate-800/90" : "transition hover:bg-blue-50/40"}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-100">
                        {device.org_name}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {device.device_name || "Unnamed device"}
                        </p>
                        <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {device.tag_value}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
                          {device.bucket_name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {device.measurement_name}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {device.tag_key} = {device.tag_value}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingDelete(device)}
                          disabled={deletingId === device.id}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            dark
                              ? "border-red-400 bg-red-500/10 text-red-300 hover:border-red-500 hover:bg-red-600 hover:text-white"
                              : "border-red-300 bg-red-50 text-red-600 hover:border-red-500 hover:bg-red-600 hover:text-white"
                          }`}
                        >
                          <Trash2 size={15} />
                          {deletingId === device.id ? "Removing..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(error || notice) && (
        <div
          className="
            fixed right-5 top-5 z-[80]
            flex w-[min(420px,calc(100vw-2.5rem))]
            items-start gap-3 rounded-2xl border p-4 shadow-2xl
            backdrop-blur-xl
            animate-[fadeIn_.2s_ease-out]
          "
          role="status"
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              error
                ? "bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300"
            }`}
          >
            {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
          </div>

          <div
            className={`min-w-0 flex-1 pt-0.5 text-sm ${
              error
                ? "text-red-800 dark:text-red-200"
                : "text-emerald-800 dark:text-emerald-200"
            }`}
          >
            <p className="font-bold">
              {error ? "Action failed" : "Success"}
            </p>
            <p className="mt-1 leading-relaxed opacity-90">
              {error || notice}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
            }}
            className="
              rounded-xl p-1.5 text-gray-400 transition
              hover:bg-gray-100 hover:text-gray-700
              dark:hover:bg-gray-800 dark:hover:text-white
            "
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {pendingDelete && (
        <div
          className="
            fixed inset-0 z-[70] flex items-center justify-center
            bg-black/60 p-6 backdrop-blur-sm
          "
          onClick={() => {
            if (!deletingId) setPendingDelete(null);
          }}
        >
          <div
            className="
              w-full max-w-md rounded-3xl border border-gray-200
              bg-white p-7 shadow-2xl
              dark:border-gray-700 dark:bg-gray-900
            "
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300">
              <Trash2 size={22} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
              Remove device assignment?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Remove 
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {pendingDelete.device_name ||
                  `${pendingDelete.measurement_name} / ${pendingDelete.tag_value}`}
              </span> from {pendingDelete.org_name}. Organization admins will no longer be able to select this device in Template Builder.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={Boolean(deletingId)}
                className="
                  rounded-2xl border border-gray-300 bg-white px-5 py-3
                  font-semibold text-gray-700 transition hover:bg-gray-100
                  disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800
                  dark:text-white dark:hover:bg-gray-700
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => deleteDevice(pendingDelete)}
                disabled={Boolean(deletingId)}
                className="
                  inline-flex items-center justify-center gap-2 rounded-2xl
                  bg-red-600 px-5 py-3 font-semibold text-white
                  transition hover:bg-red-700 disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {deletingId ? (
                  <RefreshCw className="animate-spin" size={17} />
                ) : (
                  <Trash2 size={17} />
                )}
                {deletingId ? "Removing..." : "Remove Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={closeCreateForm}
        >
          <form
            onSubmit={submitDevice}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-7 py-6 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Assign Influx Device
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Only the selected organization will be able to map and access
                  this device.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateForm}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-5 p-7 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Organization
                </span>
                <select
                  value={form.org_id}
                  onChange={(event) => updateForm("org_id", event.target.value)}
                  required
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                >
                  <option value="">Select organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Device display name
                </span>
                <input
                  value={form.device_name}
                  onChange={(event) =>
                    updateForm("device_name", event.target.value)
                  }
                  placeholder="Sterilizer 01"
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                />
              </label>

              <label>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Bucket
                </span>
                <select
                  value={form.bucket_name}
                  onChange={(event) =>
                    updateForm("bucket_name", event.target.value)
                  }
                  required
                  disabled={metadataLoading && availableBuckets.length === 0}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                >
                  <option value="">Select available bucket</option>
                  {availableBuckets.map((bucketName) => (
                    <option key={bucketName} value={bucketName}>
                      {bucketName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Measurement
                </span>
                <select
                  value={form.measurement_name}
                  onChange={(event) =>
                    updateForm("measurement_name", event.target.value)
                  }
                  required
                  disabled={!form.bucket_name || metadataLoading}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                >
                  <option value="">Select available measurement</option>
                  {availableMeasurements.map((measurementName) => (
                    <option key={measurementName} value={measurementName}>
                      {measurementName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Tag key
                </span>
                <input
                  value={form.tag_key}
                  onChange={(event) =>
                    updateForm("tag_key", event.target.value)
                  }
                  placeholder="id"
                  required
                  pattern="[A-Za-z_][A-Za-z0-9_]*"
                  title="Use letters, numbers, and underscores. The first character cannot be a number."
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                />
              </label>

              <label>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Tag value / device ID
                </span>
                <select
                  value={form.tag_value}
                  onChange={(event) =>
                    updateForm("tag_value", event.target.value)
                  }
                  required
                  disabled={
                    !form.measurement_name ||
                    !form.tag_key ||
                    metadataLoading
                  }
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                >
                  <option value="">Select available device ID</option>
                  {availableIds.map((deviceId) => (
                    <option key={deviceId} value={deviceId}>
                      {deviceId}
                    </option>
                  ))}
                </select>
              </label>

              <div
                className={`md:col-span-2 rounded-2xl border px-4 py-3 text-xs ${
                  dark
                    ? "border-blue-900/80 bg-blue-950/45 text-blue-200"
                    : "border-blue-100 bg-blue-50 text-blue-700"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {metadataLoading
                      ? "Loading available Influx metadata..."
                      : `${availableBuckets.length} bucket(s) · ${availableMeasurements.length} measurement(s) · ${availableIds.length} device ID(s) · ${availableChannels.length} channel(s)`}
                  </span>
                  <button
                    type="button"
                    onClick={refreshInfluxMetadata}
                    disabled={metadataLoading}
                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={14}
                      className={metadataLoading ? "animate-spin" : ""}
                    />
                    Refresh metadata
                  </button>
                </div>

                {metadataError && (
                  <p className="mt-2 text-red-600 dark:text-red-300">
                    {metadataError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-7 py-6 sm:flex-row sm:justify-end dark:border-gray-700">
              <button
                type="button"
                onClick={closeCreateForm}
                disabled={saving}
                className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw className="animate-spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                {saving ? "Assigning..." : "Assign Device"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
