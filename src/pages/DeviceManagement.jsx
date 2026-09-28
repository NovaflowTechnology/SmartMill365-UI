import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  Trash2,
  X,
} from "lucide-react";

import {
  PageHeader,
  controlClasses,
} from "../components/ControlCenterUI";
import {
  confirmAction,
  notify,
} from "../utils/feedback";
import {
  getMeasurementGroup,
} from "../utils/measurementGroups";

const API_BASE_URL =
  "http://localhost:5000";

const DEVICE_REQUEST_TIMEOUT_MS = 12000;
const CHANNEL_DEVICE_CONCURRENCY = 2;
const CHANNEL_MEASUREMENT_CONCURRENCY = 2;

const mapWithConcurrency = async (
  items,
  concurrency,
  mapper
) => {
  const source = Array.isArray(items) ? items : [];
  const results = new Array(source.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < source.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(
        source[currentIndex],
        currentIndex
      );
    }
  };

  const workerCount = Math.min(
    source.length,
    Math.max(1, Number(concurrency) || 1)
  );

  await Promise.all(
    Array.from({ length: workerCount }, () => worker())
  );

  return results;
};

const assignmentKey = ({
  orgId,
  bucket,
  tagKey,
  tagValue,
}) =>
  [
    orgId,
    bucket,
    tagKey,
    tagValue,
  ]
    .map((value) =>
      String(value || "")
    )
    .join("::");

// The database still stores one permission row per measurement so the
// existing runtime access checks continue to work. Device Management hides
// that implementation detail and groups those rows back into ONE Device ID.
const groupAssignmentRows = (
  rows = []
) => {
  const groups = new Map();

  rows.forEach((row) => {
    const key = assignmentKey({
      orgId: row.org_id,
      bucket: row.bucket_name,
      tagKey: row.tag_key,
      tagValue: row.tag_value,
    });

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        org_id: row.org_id,
        org_name: row.org_name,
        bucket_name: row.bucket_name,
        tag_key: row.tag_key || "id",
        tag_value: row.tag_value,
        device_name:
          row.device_name ||
          row.tag_value,
        measurement_names: [],
        assignment_ids: [],
      });
    }

    const group = groups.get(key);

    if (
      row.measurement_name &&
      !group.measurement_names.includes(
        row.measurement_name
      )
    ) {
      group.measurement_names.push(
        row.measurement_name
      );
    }

    if (row.id) {
      group.assignment_ids.push(row.id);
    }
  });

  return [...groups.values()].map(
    (group) => ({
      ...group,
      measurement_names: [
        ...group.measurement_names,
      ].sort(),
    })
  );
};

const ORGANIZATION_HEADER_PALETTES = [
  {
    light: "from-cyan-50 via-sky-50 to-indigo-50 border-cyan-200",
    dark: "from-cyan-400/10 via-sky-400/5 to-indigo-400/10 border-cyan-400/20",
    iconLight: "bg-white/80 text-cyan-700 ring-1 ring-cyan-100",
    iconDark: "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/20",
    badgeLight: "bg-cyan-100 text-cyan-800",
    badgeDark: "bg-cyan-400/10 text-cyan-200",
  },
  {
    light: "from-violet-50 via-fuchsia-50 to-indigo-50 border-violet-200",
    dark: "from-violet-400/10 via-fuchsia-400/5 to-indigo-400/10 border-violet-400/20",
    iconLight: "bg-white/80 text-violet-700 ring-1 ring-violet-100",
    iconDark: "bg-violet-400/10 text-violet-200 ring-1 ring-violet-400/20",
    badgeLight: "bg-violet-100 text-violet-800",
    badgeDark: "bg-violet-400/10 text-violet-200",
  },
  {
    light: "from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200",
    dark: "from-emerald-400/10 via-teal-400/5 to-cyan-400/10 border-emerald-400/20",
    iconLight: "bg-white/80 text-emerald-700 ring-1 ring-emerald-100",
    iconDark: "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/20",
    badgeLight: "bg-emerald-100 text-emerald-800",
    badgeDark: "bg-emerald-400/10 text-emerald-200",
  },
  {
    light: "from-amber-50 via-orange-50 to-rose-50 border-amber-200",
    dark: "from-amber-400/10 via-orange-400/5 to-rose-400/10 border-amber-400/20",
    iconLight: "bg-white/80 text-amber-700 ring-1 ring-amber-100",
    iconDark: "bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/20",
    badgeLight: "bg-amber-100 text-amber-800",
    badgeDark: "bg-amber-400/10 text-amber-200",
  },
];

const getOrganizationPalette = (index) =>
  ORGANIZATION_HEADER_PALETTES[
    index % ORGANIZATION_HEADER_PALETTES.length
  ];

export default function DeviceManagement({
  dark = false,
}) {
  const requestControllersRef = useRef(new Set());
  const loadPageRequestIdRef = useRef(0);

  const abortableFetch = useCallback(async (input, init = {}) => {
    const controller = new AbortController();
    const upstreamSignal = init.signal;
    const abortFromUpstream = () =>
      controller.abort(upstreamSignal.reason);

    if (upstreamSignal?.aborted) {
      abortFromUpstream();
    } else {
      upstreamSignal?.addEventListener("abort", abortFromUpstream, {
        once: true,
      });
    }

    requestControllersRef.current.add(controller);

    const timeout = window.setTimeout(() => {
      controller.abort(
        new DOMException("Device request timed out", "TimeoutError")
      );
    }, DEVICE_REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
      upstreamSignal?.removeEventListener("abort", abortFromUpstream);
      requestControllersRef.current.delete(controller);
    }
  }, []);

  useEffect(
    () => () => {
      loadPageRequestIdRef.current += 1;
      requestControllersRef.current.forEach((controller) => {
        controller.abort(
          new DOMException("Device page closed", "AbortError")
        );
      });
      requestControllersRef.current.clear();
    },
    []
  );

  const role =
    localStorage.getItem("role");

  const isSuperadmin =
    role === "superadmin";

  const isAdmin =
    role === "admin";

  const isEditor =
    role === "editor";

  const isViewer =
    role === "viewer";

  const canViewDevices =
    isSuperadmin ||
    isAdmin ||
    isEditor ||
    isViewer;

  const currentOrgId =
    localStorage.getItem("org_id");

  const currentOrgName =
    localStorage.getItem("org_name");

  const token =
    localStorage.getItem("token");

  const [organizations, setOrganizations] =
    useState([]);
  const [assignments, setAssignments] =
    useState([]);
  const [availableBuckets, setAvailableBuckets] =
    useState([]);
  const [availableMeasurements, setAvailableMeasurements] =
    useState([]);

  // Device IDs are discovered exactly like the Data Source path:
  // Bucket -> Measurement -> Device ID.
  // The selected measurement is ONLY a discovery filter. Assignment itself
  // remains Device ID -> Organization.
  const [influxDeviceIds, setInfluxDeviceIds] =
    useState([]);

  const [loading, setLoading] =
    useState(true);
  const [discoveryLoading, setDiscoveryLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);

  const [showAssignModal, setShowAssignModal] =
    useState(false);
  const [selectedOrgId, setSelectedOrgId] =
    useState("");
  const [selectedBucket, setSelectedBucket] =
    useState("");
  const [selectedMeasurement, setSelectedMeasurement] =
    useState("");
  const [selectedDeviceId, setSelectedDeviceId] =
    useState("");

  const [assignmentOrgFilter, setAssignmentOrgFilter] =
    useState("");
  const [assignmentSearch, setAssignmentSearch] =
    useState("");
  const [viewMode, setViewMode] = useState(
    () =>
      localStorage.getItem("device_management_view") ||
      "grid"
  );
  const [discoverySearch, setDiscoverySearch] =
    useState("");
  const [error, setError] =
    useState("");

  const [
    channelsByDevice,
    setChannelsByDevice,
  ] = useState({});

  const [
    expandedChannelDevices,
    setExpandedChannelDevices,
  ] = useState({});

  const toggleDeviceChannels = (key) => {
    setExpandedChannelDevices(
      (current) => ({
        ...current,
        [key]: !current[key],
      })
    );
  };

  const headers = (
    json = false
  ) => ({
    ...(json
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),
    Authorization: token,
  });

  const readPayload = async (
    response,
    fallback
  ) => {
    let payload = {};

    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(
        payload?.error || fallback
      );
    }

    return payload;
  };

  const loadPage = async () => {
    const requestId =
      loadPageRequestIdRef.current + 1;
    loadPageRequestIdRef.current = requestId;

    if (!canViewDevices) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSuperadmin) {
        const [
          orgResponse,
          assignmentResponse,
        ] = await Promise.all([
          abortableFetch(
            `${API_BASE_URL}/organizations`,
            {
              headers: headers(),
            }
          ),
          abortableFetch(
            `${API_BASE_URL}/organization-influx-devices`,
            {
              headers: headers(),
            }
          ),
        ]);

        const [
          orgData,
          assignmentData,
        ] = await Promise.all([
          readPayload(
            orgResponse,
            "Failed to load organizations"
          ),
          readPayload(
            assignmentResponse,
            "Failed to load device assignments"
          ),
        ]);

        if (loadPageRequestIdRef.current !== requestId) {
          return;
        }

        setOrganizations(
          Array.isArray(orgData)
            ? orgData
            : []
        );

        setAssignments(
          Array.isArray(assignmentData)
            ? assignmentData
            : []
        );
      } else {
        const response = await abortableFetch(
          `${API_BASE_URL}/influx/allowed-devices`,
          {
            headers: headers(),
          }
        );

        const assignmentData =
          await readPayload(
            response,
            "Failed to load assigned devices"
          );

        if (loadPageRequestIdRef.current !== requestId) {
          return;
        }

        setAssignments(
          Array.isArray(assignmentData)
            ? assignmentData
            : []
        );

        setOrganizations(
          currentOrgId
            ? [
                {
                  id: Number(currentOrgId),
                  name:
                    currentOrgName ||
                    assignmentData?.[0]?.org_name ||
                    "My Organization",
                },
              ]
            : []
        );
      }
    } catch (requestError) {
      if (
        loadPageRequestIdRef.current === requestId &&
        requestError?.name !== "AbortError"
      ) {
        setError(
          requestError.message ||
            "Failed to load Device Management"
        );
      }
    } finally {
      if (loadPageRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadPage();
  }, [
    canViewDevices,
    isSuperadmin,
    currentOrgId,
    currentOrgName,
  ]);

  useEffect(() => {
    localStorage.setItem(
      "device_management_view",
      viewMode
    );
  }, [viewMode]);

  const deviceAssignments = useMemo(
    () => groupAssignmentRows(assignments),
    [assignments]
  );

  useEffect(() => {
    if (
      !canViewDevices ||
      deviceAssignments.length === 0
    ) {
      setChannelsByDevice({});
      return undefined;
    }

    let cancelled = false;
    const channelController = new AbortController();

    setChannelsByDevice((current) =>
      Object.fromEntries(
        deviceAssignments.map((item) => [
          item.key,
          {
            loading: true,
            channels:
              current[item.key]?.channels ||
              [],
            error: "",
          },
        ])
      )
    );

    const loadChannels = async () => {
      const entries = await mapWithConcurrency(
        deviceAssignments,
        CHANNEL_DEVICE_CONCURRENCY,
          async (item) => {
            try {
              const responses =
                await mapWithConcurrency(
                  (
                    item.measurement_names ||
                    []
                  ),
                  CHANNEL_MEASUREMENT_CONCURRENCY,
                    async (
                      measurement
                    ) => {
                      const params =
                        new URLSearchParams({
                          bucket:
                            item.bucket_name ||
                            "",
                          measurement,
                          tagKey:
                            item.tag_key ||
                            "id",
                          tagValue:
                            item.tag_value ||
                            "",
                        });

                      const response =
                        await abortableFetch(
                          `${API_BASE_URL}/influx/channels?${params.toString()}`,
                          {
                            headers: {
                              Authorization:
                                token,
                            },
                            signal:
                              channelController.signal,
                          }
                        );

                      const payload =
                        await readPayload(
                          response,
                          "Failed to load channels"
                        );

                      return Array.isArray(
                        payload?.channels
                      )
                        ? payload.channels
                        : Array.isArray(
                            payload?.fields
                          )
                        ? payload.fields
                        : [];
                    }
                );

              const channels = [
                ...new Set(
                  responses
                    .flat()
                    .filter(Boolean)
                ),
              ].sort();

              return [
                item.key,
                {
                  loading: false,
                  channels,
                  error: "",
                },
              ];
            } catch (requestError) {
              return [
                item.key,
                {
                  loading: false,
                  channels: [],
                  error:
                    requestError.message ||
                    "Channels unavailable",
                },
              ];
            }
          }
      );

      if (!cancelled) {
        setChannelsByDevice(
          Object.fromEntries(entries)
        );
      }
    };

    loadChannels();

    return () => {
      cancelled = true;
      channelController.abort(
        new DOMException("Device channel loading stopped", "AbortError")
      );
    };
  }, [
    canViewDevices,
    deviceAssignments,
    token,
    abortableFetch,
  ]);

  const filteredAssignments = useMemo(() => {
    const query = assignmentSearch
      .trim()
      .toLowerCase();

    return deviceAssignments.filter(
      (item) => {
        if (
          assignmentOrgFilter &&
          String(item.org_id) !==
            String(assignmentOrgFilter)
        ) {
          return false;
        }

        if (!query) return true;

        return [
          item.org_name,
          item.tag_value,
          item.measurement_names?.join(" "),
          channelsByDevice[
            item.key
          ]?.channels?.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      }
    );
  }, [
    deviceAssignments,
    assignmentOrgFilter,
    assignmentSearch,
    channelsByDevice,
  ]);

  const groupedAssignments = useMemo(() => {
    const groups = new Map();

    filteredAssignments.forEach((item) => {
      const organizationKey = String(
        item.org_id ?? item.org_name ?? "unassigned"
      );

      if (!groups.has(organizationKey)) {
        groups.set(organizationKey, {
          key: organizationKey,
          org_id: item.org_id,
          org_name:
            item.org_name || "Unassigned Organization",
          devices: [],
        });
      }

      groups.get(organizationKey).devices.push(item);
    });

    return [...groups.values()].sort((a, b) =>
      String(a.org_name).localeCompare(
        String(b.org_name),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      )
    );
  }, [filteredAssignments]);


  const fetchBuckets = async () => {
    const response = await abortableFetch(
      `${API_BASE_URL}/influx/buckets`,
      {
        headers: headers(),
      }
    );

    const payload = await readPayload(
      response,
      "Failed to load Influx buckets"
    );

    const buckets = Array.isArray(
      payload?.buckets
    )
      ? payload.buckets
      : [];

    setAvailableBuckets(buckets);
    return buckets;
  };

  const fetchMeasurements = async (
    bucketName
  ) => {
    if (!bucketName) {
      setAvailableMeasurements([]);
      return [];
    }

    setDiscoveryLoading(true);
    setError("");

    try {
      const response = await abortableFetch(
        `${API_BASE_URL}/influx/measurements?bucket=${encodeURIComponent(
          bucketName
        )}`,
        {
          headers: headers(),
        }
      );

      const payload = await readPayload(
        response,
        "Failed to load Influx measurements"
      );

      const measurements = Array.isArray(
        payload?.measurements
      )
        ? payload.measurements
        : [];

      setAvailableMeasurements(measurements);

      return measurements;
    } catch (requestError) {
      setAvailableMeasurements([]);
      setError(
        requestError.message ||
          "Failed to load Influx measurements"
      );
      return [];
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const discoverInfluxDeviceIds = async (
    bucketName,
    measurementName
  ) => {
    if (!bucketName || !measurementName) {
      setInfluxDeviceIds([]);
      return [];
    }

    setDiscoveryLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        bucket: bucketName,
        measurement: measurementName,
        tagKey: "id",
      });

      const response = await abortableFetch(
        `${API_BASE_URL}/influx/ids?${query.toString()}`,
        {
          headers: headers(),
        }
      );

      const payload = await readPayload(
        response,
        "Failed to discover Device IDs for the selected measurement"
      );

      const ids = Array.isArray(payload?.ids)
        ? payload.ids
        : [];

      setInfluxDeviceIds(ids);

      return ids;
    } catch (requestError) {
      setInfluxDeviceIds([]);
      setError(
        requestError.message ||
          "Failed to discover Device IDs"
      );
      return [];
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const resetSourcePathAfterBucket = () => {
    setSelectedMeasurement("");
    setSelectedDeviceId("");
    setInfluxDeviceIds([]);
    setDiscoverySearch("");
  };

  const resetSourcePathAfterMeasurement = () => {
    setSelectedDeviceId("");
    setDiscoverySearch("");
  };

  const openAssignModal = async () => {
    setShowAssignModal(true);
    setSelectedMeasurement("");
    setSelectedDeviceId("");
    setInfluxDeviceIds([]);
    setAvailableMeasurements([]);
    setDiscoverySearch("");
    setError("");

    try {
      const buckets = await fetchBuckets();

      // Do not auto-select a Device ID. The user follows the same
      // Source Path flow as Template Designer.
      const bucketName =
        selectedBucket ||
        buckets[0] ||
        "";

      setSelectedBucket(bucketName);

      if (bucketName) {
        await fetchMeasurements(bucketName);
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          "Failed to open device assignment"
      );
    }
  };

  const detectedDeviceType = useMemo(() => {
    if (!selectedMeasurement) {
      return "";
    }

    return getMeasurementGroup(
      selectedMeasurement
    ).label;
  }, [selectedMeasurement]);

  const assignedDeviceIdSet = useMemo(() => {
    if (!selectedOrgId || !selectedBucket) {
      return new Set();
    }

    return new Set(
      deviceAssignments
        .filter(
          (item) =>
            String(item.org_id) ===
              String(selectedOrgId) &&
            item.bucket_name ===
              selectedBucket &&
            (item.tag_key || "id") ===
              "id"
        )
        .map((item) =>
          String(item.tag_value)
        )
    );
  }, [
    deviceAssignments,
    selectedOrgId,
    selectedBucket,
  ]);

  const filteredInfluxDeviceIds =
    useMemo(() => {
      const query = discoverySearch
        .trim()
        .toLowerCase();

      const ids = influxDeviceIds
        .map(String)
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );

      if (!query) return ids;

      return ids.filter((deviceId) =>
        deviceId
          .toLowerCase()
          .includes(query)
      );
    }, [
      influxDeviceIds,
      discoverySearch,
    ]);

  const availableDeviceIds =
    filteredInfluxDeviceIds.filter(
      (deviceId) =>
        !assignedDeviceIdSet.has(
          String(deviceId)
        )
    );


  const assignSelected = async () => {
    if (!selectedOrgId) {
      setError(
        "Select an organization first."
      );
      return;
    }

    if (!selectedBucket) {
      setError(
        "Select an Influx bucket first."
      );
      return;
    }

    if (!selectedMeasurement) {
      setError(
        "Select a measurement first."
      );
      return;
    }

    if (!selectedDeviceId) {
      setError(
        "Select a Device ID."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Use the same exact-source assignment method as the previous
      // Device Management implementation:
      //
      // Bucket + Measurement + tag key + Device ID
      //
      // Do NOT rediscover the Device ID across the whole bucket after the
      // user has already selected it from /influx/ids for this measurement.
      const response = await abortableFetch(
        `${API_BASE_URL}/organization-influx-devices`,
        {
          method: "POST",
          headers: headers(true),
          body: JSON.stringify({
            org_id: Number(selectedOrgId),
            bucket_name: selectedBucket,
            measurement_name:
              selectedMeasurement,
            tag_key: "id",
            tag_value:
              selectedDeviceId,
            device_name:
              selectedDeviceId,
          }),
        }
      );

      await readPayload(
        response,
        "Failed to assign Device ID"
      );

      const organizationName =
        organizations.find(
          (organization) =>
            String(organization.id) ===
            String(selectedOrgId)
        )?.name || "organization";

      notify(
        `Device ID ${selectedDeviceId} assigned to ${organizationName}.`,
        "success"
      );

      setSelectedDeviceId("");
      await loadPage();
      setShowAssignModal(false);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Failed to assign Device ID"
      );
    } finally {
      setSaving(false);
    }
  };


  const removeDeviceAssignment = async (
    item
  ) => {
    if (!isSuperadmin) return;

    const confirmed = await confirmAction({
      title: "Remove device assignment?",
      message: `Remove Device ID ${item.tag_value} from ${item.org_name}?`,
      confirmLabel: "Remove Assignment",
      tone: "danger",
    });

    if (!confirmed) return;

    setError("");

    try {
      const response = await abortableFetch(
        `${API_BASE_URL}/organization-influx-devices/bulk-remove`,
        {
          method: "POST",
          headers: headers(true),
          body: JSON.stringify({
            assignment_ids:
              item.assignment_ids,
          }),
        }
      );

      await readPayload(
        response,
        "Failed to remove Device ID"
      );

      setAssignments((current) =>
        current.filter(
          (row) =>
            !item.assignment_ids.includes(
              row.id
            )
        )
      );

      notify(
        `Device ID ${item.tag_value} removed from ${item.org_name}.`,
        "success"
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Failed to remove Device ID"
      );
    }
  };

  if (!canViewDevices) {
    return (
      <div className="p-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          You do not have permission to view devices.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-[calc(100vh-1.25rem)] min-h-0 w-full flex-col overflow-hidden p-3 ${
        dark
          ? "text-slate-100"
          : "text-slate-900"
      }`}
    >
      <style>{`
        .device-group-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${dark ? "#334155 #0f172a" : "#94a3b8 transparent"};
        }

        .device-group-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .device-group-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .device-group-scroll::-webkit-scrollbar-thumb {
          background: ${dark ? "#334155" : "#cbd5e1"};
          border-radius: 999px;
        }

        .device-group-scroll::-webkit-scrollbar-thumb:hover {
          background: ${dark ? "#475569" : "#94a3b8"};
        }
      `}</style>

      <PageHeader
        icon={ServerCog}
        title="Device Management"
        description={
          isSuperadmin
            ? "View and assign industrial Device IDs to organizations."
            : `View devices available to ${
                currentOrgName ||
                "your organization"
              }.`
        }
        className="mb-3 shrink-0"
        actions={
          isSuperadmin ? (
            <button
              type="button"
              onClick={openAssignModal}
              className={
                controlClasses.primary
              }
            >
              <Plus size={14} />
              Assign Device ID
            </button>
          ) : null
        }
      />

      {error && (
        <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div
        className={`mb-4 shrink-0 rounded-2xl border px-4 py-4 shadow-sm ${
          dark
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {isSuperadmin ? (
            <div className="w-full lg:w-[240px]">
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
              Organization
            </label>

            <select
              value={assignmentOrgFilter}
              onChange={(event) =>
                setAssignmentOrgFilter(
                  event.target.value
                )
              }
              className={`h-10 w-full rounded-xl border px-3 text-xs outline-none transition ${
                dark
                  ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-cyan-400"
                  : "border-slate-300 bg-white text-slate-900 focus:border-cyan-500"
              }`}
            >
              <option value="">
                All organizations
              </option>

              {organizations.map(
                (organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.name}
                  </option>
                )
              )}
            </select>
          </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
              Search
            </label>

            <div className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={assignmentSearch}
                  onChange={(event) =>
                    setAssignmentSearch(
                      event.target.value
                    )
                  }
                  placeholder={
                    isSuperadmin
                      ? "Search organization, Device ID, measurement, or channel..."
                      : "Search Device ID, measurement, or channel..."
                  }
                  className={`h-10 w-full rounded-xl border pl-10 pr-3 text-xs outline-none transition ${
                    dark
                      ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
                      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                  }`}
                />
              </div>

              <div
                className={`flex h-10 shrink-0 items-center rounded-xl border p-1 ${
                  dark
                    ? "border-slate-700 bg-slate-950"
                    : "border-slate-300 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-bold transition ${
                    viewMode === "grid"
                      ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid size={13} />
                  <span className="hidden sm:inline">Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-bold transition ${
                    viewMode === "list"
                      ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                  title="List view"
                >
                  <List size={13} />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className={`flex min-h-0 flex-1 items-center justify-center rounded-xl border p-8 text-center text-xs text-slate-400 ${
            dark
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white"
          }`}
        >
          Loading device assignments...
        </div>
      ) : groupedAssignments.length === 0 ? (
        <div
          className={`flex min-h-0 flex-1 items-center justify-center rounded-xl border p-8 text-center text-xs text-slate-400 ${
            dark
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white"
          }`}
        >
          No Device ID assignments found.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div
            className={
              viewMode === "grid"
                ? isSuperadmin
                  ? "grid gap-4 lg:grid-cols-2"
                  : "grid grid-cols-1 gap-4"
                : "grid grid-cols-1 gap-3"
            }
          >
          {groupedAssignments.map(
            (group, groupIndex) => {

              const palette =
                getOrganizationPalette(
                  groupIndex
                );

              return (
                <section
                  key={group.key}
                  className={`overflow-hidden rounded-2xl border shadow-sm ${
                    dark
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div
                    className={`flex w-full items-center justify-between gap-3 border-b bg-gradient-to-r px-4 py-3.5 text-left ${
                      dark
                        ? `${palette.dark} border-slate-700/80`
                        : `${palette.light} border-slate-200`
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                          dark
                            ? palette.iconDark
                            : palette.iconLight
                        }`}
                      >
                        <ServerCog size={17} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-[13px] font-black text-slate-900 dark:text-white">
                            {group.org_name}
                          </h3>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                              dark
                                ? palette.badgeDark
                                : palette.badgeLight
                            }`}
                          >
                            {group.devices.length} {group.devices.length === 1 ? "Device" : "Devices"}
                          </span>

                        </div>

                        <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-400">
                          Device IDs assigned to this organization
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5">
                    <div
                      className={`grid items-start gap-3 ${
                        viewMode === "list"
                          ? "grid-cols-1"
                          : "grid-cols-1 xl:grid-cols-2"
                      }`}
                    >
                      {group.devices.map((item) => {
                        const primaryMeasurement = item.measurement_names?.[0];
                        const extraMeasurementCount = Math.max(
                          0,
                          (item.measurement_names?.length || 0) - 1
                        );

                        const deviceType =
                          primaryMeasurement
                            ? getMeasurementGroup(
                                primaryMeasurement
                              )?.label ||
                              "Unclassified"
                            : "Unclassified";

                        const channelState =
                          channelsByDevice[
                            item.key
                          ] || {
                            loading: true,
                            channels: [],
                            error: "",
                          };

                        const channelsExpanded =
                          !isSuperadmin ||
                          Boolean(
                            expandedChannelDevices[
                              item.key
                            ]
                          );

                        return (
                          <div
                            key={item.key}
                            className={`group relative flex min-h-[128px] min-w-0 flex-col rounded-xl border p-3 transition ${
                              dark
                                ? "border-slate-800 bg-slate-950/55 hover:border-cyan-400/25"
                                : "border-slate-200 bg-slate-50/70 hover:border-cyan-200 hover:bg-white"
                            }`}
                          >
                            <div className="flex min-h-0 flex-1 flex-col">
                              <div className="flex min-w-0 flex-wrap items-center gap-2 pr-8">
                                <p
                                  className="min-w-0 truncate font-mono text-[11px] font-black text-cyan-700 dark:text-cyan-300"
                                  title={item.tag_value}
                                >
                                  {item.tag_value}
                                </p>

                                <span
                                  className="
                                    shrink-0 rounded-md
                                    bg-sky-50 px-2 py-1
                                    text-[8px] font-black
                                    text-sky-700
                                    dark:bg-sky-400/10
                                    dark:text-sky-200
                                  "
                                  title="Detected device type"
                                >
                                  {deviceType}
                                </span>
                              </div>

                              <div className="mt-2 flex min-h-[24px] items-center">
                                {primaryMeasurement ? (
                                  <span
                                    className="max-w-full truncate rounded-md bg-violet-50 px-2 py-1 text-[8px] font-bold text-violet-700 dark:bg-violet-400/10 dark:text-violet-200"
                                    title={`Measurements: ${item.measurement_names.join(", ")}`}
                                  >
                                    {primaryMeasurement}
                                    {extraMeasurementCount > 0
                                      ? ` +${extraMeasurementCount}`
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="text-[8px] text-slate-400">
                                    No measurement
                                  </span>
                                )}
                              </div>

                              <div className="mt-auto flex min-w-0 items-center justify-between gap-3 pt-2">
                                <div className="flex min-w-0 items-center gap-2 text-[8px] text-slate-400">
                                  <span className="inline-flex shrink-0 items-center gap-1 font-bold text-cyan-700 dark:text-cyan-300">
                                    <Check size={8} />
                                    Assigned
                                  </span>

                                  {!isSuperadmin && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        {channelState.loading
                                          ? "Loading channels..."
                                          : `${channelState.channels.length} ${
                                              channelState.channels.length === 1
                                                ? "channel"
                                                : "channels"
                                            }`}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {isSuperadmin && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleDeviceChannels(
                                        item.key
                                      )
                                    }
                                    className="
                                      inline-flex h-7 shrink-0
                                      items-center gap-1.5
                                      rounded-lg border
                                      border-cyan-100
                                      bg-cyan-50 px-2.5
                                      text-[8px] font-bold
                                      text-cyan-700
                                      transition
                                      hover:bg-cyan-100
                                      dark:border-cyan-400/10
                                      dark:bg-cyan-400/10
                                      dark:text-cyan-200
                                      dark:hover:bg-cyan-400/15
                                    "
                                    title={
                                      channelsExpanded
                                        ? "Hide channels"
                                        : "Show channels"
                                    }
                                  >
                                    {channelState.loading
                                      ? "Loading..."
                                      : `${channelState.channels.length} ${
                                          channelState.channels.length === 1
                                            ? "Channel"
                                            : "Channels"
                                        }`}

                                    {channelsExpanded ? (
                                      <ChevronUp size={11} />
                                    ) : (
                                      <ChevronDown size={11} />
                                    )}
                                  </button>
                                )}
                              </div>

                              {channelsExpanded && (
                                <div className="mt-3 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-400">
                                      Channels
                                    </span>

                                    <span className="text-[8px] font-semibold text-slate-400">
                                      {channelState.loading
                                        ? "Loading..."
                                        : `${channelState.channels.length} available`}
                                    </span>
                                  </div>

                                  <div
                                    className="grid grid-cols-2 gap-1.5"
                                    title={
                                      channelState.channels.join(
                                        ", "
                                      ) || undefined
                                    }
                                  >
                                    {channelState.loading ? (
                                      <span className="col-span-2 text-[8px] text-slate-400">
                                        Discovering available channels…
                                      </span>
                                    ) : channelState.channels.length > 0 ? (
                                      channelState.channels.map(
                                        (channel) => (
                                          <span
                                            key={channel}
                                            className="
                                              min-w-0 truncate
                                              rounded-lg
                                              border border-cyan-100
                                              bg-cyan-50
                                              px-2 py-1.5
                                              font-mono text-[8px]
                                              font-semibold
                                              text-cyan-700
                                              dark:border-cyan-400/10
                                              dark:bg-cyan-400/10
                                              dark:text-cyan-200
                                            "
                                            title={channel}
                                          >
                                            {channel}
                                          </span>
                                        )
                                      )
                                    ) : (
                                      <span className="col-span-2 text-[8px] text-slate-400">
                                        {channelState.error
                                          ? "Channels unavailable"
                                          : "No channels found"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {isSuperadmin ? (
                              <button
                                type="button"
                                onClick={() =>
                                  removeDeviceAssignment(
                                    item
                                  )
                                }
                                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-65 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10"
                                title={`Remove ${item.tag_value} from ${group.org_name}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            }
          )}
          </div>
        </div>
      )}

      {isSuperadmin && showAssignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3"
          onClick={() =>
            setShowAssignModal(false)
          }
        >
          <div
            className={`flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
              dark
                ? "border-slate-700 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={`flex shrink-0 items-center justify-between border-b px-5 py-4 ${
                dark
                  ? "border-slate-700"
                  : "border-slate-200"
              }`}
            >
              <div>
                <h2 className="text-base font-bold">
                  Assign Influx Device ID
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Follow the same source path used by Data Source configuration. The selected Bucket, Measurement, and Device ID are saved together as the assigned Influx source.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAssignModal(false)
                }
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close device assignment"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {/* ORGANIZATION */}
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                      Assign To
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Choose the organization / group that should be allowed to use this Device ID.
                    </p>
                  </div>
                </div>

                <select
                  value={selectedOrgId}
                  onChange={(event) => {
                    setSelectedOrgId(
                      event.target.value
                    );
                    setSelectedDeviceId("");
                  }}
                  className={`h-10 w-full rounded-xl border px-3 text-xs outline-none md:max-w-md ${
                    dark
                      ? "border-slate-700 bg-slate-950"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <option value="">
                    Select organization / group
                  </option>

                  {organizations.map(
                    (organization) => (
                      <option
                        key={organization.id}
                        value={organization.id}
                      >
                        {organization.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* SOURCE PATH */}
              <div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Source Path
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Use InfluxDB metadata to narrow down the exact Device ID.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const buckets =
                          await fetchBuckets();

                        if (
                          selectedBucket &&
                          buckets.includes(
                            selectedBucket
                          )
                        ) {
                          await fetchMeasurements(
                            selectedBucket
                          );

                          if (
                            selectedMeasurement
                          ) {
                            await discoverInfluxDeviceIds(
                              selectedBucket,
                              selectedMeasurement
                            );
                          }
                        }
                      } catch (
                        requestError
                      ) {
                        setError(
                          requestError.message ||
                            "Failed to refresh Influx metadata"
                        );
                      }
                    }}
                    disabled={discoveryLoading}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-semibold text-white disabled:opacity-50 dark:bg-[#17233F]"
                  >
                    <RefreshCw
                      size={13}
                      className={
                        discoveryLoading
                          ? "animate-spin"
                          : ""
                      }
                    />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  {/* 1 BUCKET */}
                  <label className={`rounded-xl border p-3 ${
                    dark
                      ? "border-slate-700 bg-[#0B1328]"
                      : "border-slate-200 bg-white"
                  }`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-50 text-[9px] font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                        1
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Bucket
                      </span>
                    </div>

                    <select
                      value={selectedBucket}
                      onChange={async (
                        event
                      ) => {
                        const value =
                          event.target.value;

                        setSelectedBucket(
                          value
                        );

                        resetSourcePathAfterBucket();

                        if (value) {
                          await fetchMeasurements(
                            value
                          );
                        } else {
                          setAvailableMeasurements(
                            []
                          );
                        }
                      }}
                      className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs outline-none ${
                        dark
                          ? "border-slate-700 bg-slate-950"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <option value="">
                        Select bucket
                      </option>

                      {availableBuckets.map(
                        (bucketName) => (
                          <option
                            key={bucketName}
                            value={bucketName}
                          >
                            {bucketName}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {/* 2 MEASUREMENT */}
                  <label className={`rounded-xl border p-3 ${
                    dark
                      ? "border-slate-700 bg-[#0B1328]"
                      : "border-slate-200 bg-white"
                  }`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-50 text-[9px] font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                        2
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Measurement
                      </span>
                    </div>

                    <select
                      value={selectedMeasurement}
                      onChange={async (
                        event
                      ) => {
                        const value =
                          event.target.value;

                        setSelectedMeasurement(
                          value
                        );

                        resetSourcePathAfterMeasurement();

                        if (
                          selectedBucket &&
                          value
                        ) {
                          await discoverInfluxDeviceIds(
                            selectedBucket,
                            value
                          );
                        } else {
                          setInfluxDeviceIds(
                            []
                          );
                        }
                      }}
                      disabled={
                        discoveryLoading ||
                        !selectedBucket
                      }
                      className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs outline-none disabled:opacity-50 ${
                        dark
                          ? "border-slate-700 bg-slate-950"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <option value="">
                        {selectedBucket
                          ? "Select measurement"
                          : "Select bucket first"}
                      </option>

                      {availableMeasurements.map(
                        (measurement) => (
                          <option
                            key={measurement}
                            value={measurement}
                          >
                            {measurement}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {/* 3 DEVICE TYPE */}
                  <div className={`rounded-xl border p-3 ${
                    dark
                      ? "border-slate-700 bg-[#0B1328]"
                      : "border-slate-200 bg-white"
                  }`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-50 text-[9px] font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                        3
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Device Type
                      </span>
                    </div>

                    <div
                      className={`flex min-h-[38px] items-center rounded-lg px-3 text-xs font-semibold ${
                        selectedMeasurement
                          ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200"
                          : dark
                          ? "bg-slate-950 text-slate-500"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {selectedMeasurement
                        ? detectedDeviceType
                        : "Detected after measurement"}
                    </div>
                  </div>

                  {/* 4 DEVICE ID */}
                  <label className={`rounded-xl border p-3 ${
                    dark
                      ? "border-slate-700 bg-[#0B1328]"
                      : "border-slate-200 bg-white"
                  }`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-50 text-[9px] font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                        4
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Device ID
                      </span>
                    </div>

                    <select
                      value={selectedDeviceId}
                      onChange={(event) =>
                        setSelectedDeviceId(
                          event.target.value
                        )
                      }
                      disabled={
                        discoveryLoading ||
                        !selectedMeasurement
                      }
                      className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs outline-none disabled:opacity-50 ${
                        dark
                          ? "border-slate-700 bg-slate-950"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <option value="">
                        {!selectedMeasurement
                          ? "Select measurement first"
                          : discoveryLoading
                          ? "Loading Device IDs..."
                          : availableDeviceIds.length
                          ? "Select Device ID"
                          : "No available Device IDs"}
                      </option>

                      {availableDeviceIds.map(
                        (deviceId) => (
                          <option
                            key={deviceId}
                            value={deviceId}
                          >
                            {deviceId}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <div
                  className={`mt-3 rounded-xl border px-3 py-2.5 ${
                    dark
                      ? "border-slate-700 bg-slate-950/60"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  {selectedDeviceId ? (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Measurement:
                        {" "}
                        <strong className="font-mono text-slate-800 dark:text-slate-200">
                          {selectedMeasurement}
                        </strong>
                      </span>

                      <span className="text-slate-500 dark:text-slate-400">
                        Type:
                        {" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {detectedDeviceType}
                        </strong>
                      </span>

                      <span className="text-slate-500 dark:text-slate-400">
                        Device ID:
                        {" "}
                        <strong className="font-mono text-cyan-700 dark:text-cyan-300">
                          {selectedDeviceId}
                        </strong>
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Follow Bucket → Measurement → Device Type → Device ID. The selected Device ID is assigned using this exact Bucket + Measurement source path.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3 ${
                dark
                  ? "border-slate-700"
                  : "border-slate-200"
              }`}
            >
              <div className="min-w-0">
                {selectedDeviceId ? (
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-300">
                    Ready to assign
                    {" "}
                    <strong className="font-mono text-cyan-700 dark:text-cyan-300">
                      {selectedDeviceId}
                    </strong>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Select one Device ID to continue.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowAssignModal(false)
                  }
                  className="h-9 rounded-lg border border-slate-300 px-4 text-xs font-semibold dark:border-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={assignSelected}
                  disabled={
                    saving ||
                    !selectedOrgId ||
                    !selectedBucket ||
                    !selectedMeasurement ||
                    !selectedDeviceId
                  }
                  className="h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Assigning..."
                    : "Assign Device ID"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
