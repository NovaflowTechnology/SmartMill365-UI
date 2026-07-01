import { useEffect, useMemo, useState } from "react";
import {
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

export default function DeviceManagement({ setPage }) {
  const role = localStorage.getItem("role");
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
    const displayName =
      device.device_name || `${device.measurement_name} / ${device.tag_value}`;

    const confirmed = window.confirm(
      `Remove “${displayName}” from ${device.org_name}?\n\nOrganization admins will no longer be able to select this device for templates.`,
    );

    if (!confirmed) return;

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

      setDevices((current) => current.filter((item) => item.id !== device.id));
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
    <div className="min-h-full w-full overflow-auto bg-transparent p-6 dark:bg-gray-900">
      <div className="relative z-10 w-full">
        <div className="sticky top-0 z-20 rounded-3xl border border-gray-200 bg-white/85 p-6 shadow-lg backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/85">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  <ServerCog size={22} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Device Management
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
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
                className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <select
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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

        {(error || notice) && (
          <div
            className={`relative z-10 mt-5 rounded-2xl border px-5 py-4 text-sm font-medium ${
              error
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="relative z-10 mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Organization Device Assignments
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
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
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      className="transition hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
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
                          onClick={() => deleteDevice(device)}
                          disabled={deletingId === device.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
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
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select available device ID</option>
                  {availableIds.map((deviceId) => (
                    <option key={deviceId} value={deviceId}>
                      {deviceId}
                    </option>
                  ))}
                </select>
              </label>

              <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
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
