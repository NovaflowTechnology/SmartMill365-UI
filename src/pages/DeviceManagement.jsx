import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  Database,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  Trash2,
  X,
} from "lucide-react";

import {
  getMeasurementGroup,
} from "../utils/measurementGroups";

const API_BASE_URL =
  "http://localhost:5000";

const logicalAssignmentKey = ({
  orgId,
  bucket,
  measurementGroup,
  tagKey,
  tagValue,
}) =>
  [
    orgId,
    bucket,
    measurementGroup,
    tagKey,
    tagValue,
  ]
    .map((value) =>
      String(value || "")
    )
    .join("::");

const groupAssignmentRows = (
  rows = []
) => {
  const groups =
    new Map();

  rows.forEach((row) => {
    const measurementGroup =
      getMeasurementGroup(
        row.measurement_name
      );

    const key =
      logicalAssignmentKey({
        orgId: row.org_id,
        bucket:
          row.bucket_name,
        measurementGroup:
          measurementGroup.key,
        tagKey:
          row.tag_key,
        tagValue:
          row.tag_value,
      });

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        org_id:
          row.org_id,
        org_name:
          row.org_name,
        bucket_name:
          row.bucket_name,
        tag_key:
          row.tag_key,
        tag_value:
          row.tag_value,
        device_type:
          measurementGroup.key,
        device_type_label:
          measurementGroup.label,
        device_name:
          row.device_name ||
          `${measurementGroup.label} · ${row.tag_value}`,
        measurement_names:
          [],
        assignment_ids:
          [],
      });
    }

    const group =
      groups.get(key);

    if (
      !group.measurement_names.includes(
        row.measurement_name
      )
    ) {
      group.measurement_names.push(
        row.measurement_name
      );
    }

    group.assignment_ids.push(
      row.id
    );
  });

  return [
    ...groups.values(),
  ].map((group) => ({
    ...group,
    measurement_names:
      [...group.measurement_names].sort(),
    measurement_count:
      group.measurement_names.length,
  }));
};

export default function DeviceManagement({
  setPage,
  dark = false,
}) {
  const role =
    localStorage.getItem("role");

  const isSuperadmin =
    role === "superadmin";

  const token =
    localStorage.getItem("token");

  const [
    organizations,
    setOrganizations,
  ] = useState([]);

  const [
    assignments,
    setAssignments,
  ] = useState([]);

  const [
    availableBuckets,
    setAvailableBuckets,
  ] = useState([]);

  const [
    logicalDevices,
    setLogicalDevices,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    discoveryLoading,
    setDiscoveryLoading,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    showAssignModal,
    setShowAssignModal,
  ] = useState(false);

  const [
    selectedOrgId,
    setSelectedOrgId,
  ] = useState("");

  const [
    selectedBucket,
    setSelectedBucket,
  ] = useState("");

  const [
    selectedLogicalKeys,
    setSelectedLogicalKeys,
  ] = useState([]);

  const [
    assignmentOrgFilter,
    setAssignmentOrgFilter,
  ] = useState("");

  const [
    assignmentSearch,
    setAssignmentSearch,
  ] = useState("");

  const [
    discoverySearch,
    setDiscoverySearch,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

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
      payload =
        await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(
        payload?.error ||
          fallback
      );
    }

    return payload;
  };

  const loadPage = async () => {
    if (!isSuperadmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        orgResponse,
        assignmentResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/organizations`,
          {
            headers:
              headers(),
          }
        ),
        fetch(
          `${API_BASE_URL}/organization-influx-devices`,
          {
            headers:
              headers(),
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

      setOrganizations(
        Array.isArray(orgData)
          ? orgData
          : []
      );

      setAssignments(
        Array.isArray(
          assignmentData
        )
          ? assignmentData
          : []
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Failed to load Device Management"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [isSuperadmin]);

  useEffect(() => {
    if (!notice) return;

    const timer =
      window.setTimeout(
        () =>
          setNotice(""),
        3500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [notice]);

  const logicalAssignments =
    useMemo(
      () =>
        groupAssignmentRows(
          assignments
        ),
      [assignments]
    );

  const filteredAssignments =
    useMemo(() => {
      const query =
        assignmentSearch
          .trim()
          .toLowerCase();

      return logicalAssignments.filter(
        (item) => {
          if (
            assignmentOrgFilter &&
            String(
              item.org_id
            ) !==
              String(
                assignmentOrgFilter
              )
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            item.org_name,
            item.device_name,
            item.device_type_label,
            item.tag_value,
            item.bucket_name,
            ...item.measurement_names,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      logicalAssignments,
      assignmentOrgFilter,
      assignmentSearch,
    ]);

  const assignedMeasurementsFor =
    (logicalDevice) => {
      if (!selectedOrgId) {
        return [];
      }

      const expectedKey =
        logicalAssignmentKey({
          orgId:
            selectedOrgId,
          bucket:
            logicalDevice.bucket_name,
          measurementGroup:
            logicalDevice.device_type,
          tagKey:
            logicalDevice.tag_key,
          tagValue:
            logicalDevice.tag_value,
        });

      return (
        logicalAssignments.find(
          (item) =>
            item.key ===
            expectedKey
        )?.measurement_names ||
        []
      );
    };

  const getAssignmentProgress =
    (logicalDevice) => {
      const assigned =
        assignedMeasurementsFor(
          logicalDevice
        );

      const total =
        logicalDevice
          .measurement_names
          ?.length || 0;

      const assignedCount =
        logicalDevice
          .measurement_names
          ?.filter(
            (measurement) =>
              assigned.includes(
                measurement
              )
          ).length || 0;

      return {
        assignedCount,
        total,
        complete:
          total > 0 &&
          assignedCount ===
            total,
        partial:
          assignedCount > 0 &&
          assignedCount <
            total,
      };
    };

  const fetchBuckets =
    async () => {
      const response =
        await fetch(
          `${API_BASE_URL}/influx/buckets`,
          {
            headers:
              headers(),
          }
        );

      const payload =
        await readPayload(
          response,
          "Failed to load Influx buckets"
        );

      const buckets =
        Array.isArray(
          payload?.buckets
        )
          ? payload.buckets
          : [];

      setAvailableBuckets(
        buckets
      );

      return buckets;
    };

  const discoverLogicalDevices =
    async (bucketName) => {
      if (!bucketName) {
        setLogicalDevices(
          []
        );
        return;
      }

      setDiscoveryLoading(
        true
      );

      setError("");

      try {
        const query =
          new URLSearchParams({
            bucket:
              bucketName,
            tagKey: "id",
          });

        const response =
          await fetch(
            `${API_BASE_URL}/influx/logical-devices?${query.toString()}`,
            {
              headers:
                headers(),
            }
          );

        const payload =
          await readPayload(
            response,
            "Failed to discover logical devices"
          );

        setLogicalDevices(
          Array.isArray(
            payload?.devices
          )
            ? payload.devices
            : []
        );
      } catch (
        requestError
      ) {
        setLogicalDevices(
          []
        );

        setError(
          requestError.message ||
            "Failed to discover logical devices"
        );
      } finally {
        setDiscoveryLoading(
          false
        );
      }
    };

  const openAssignModal =
    async () => {
      setShowAssignModal(
        true
      );

      setSelectedLogicalKeys(
        []
      );

      setDiscoverySearch(
        ""
      );

      setError("");

      try {
        const buckets =
          await fetchBuckets();

        const bucketName =
          selectedBucket ||
          buckets[0] ||
          "";

        setSelectedBucket(
          bucketName
        );

        if (bucketName) {
          await discoverLogicalDevices(
            bucketName
          );
        }
      } catch (
        requestError
      ) {
        setError(
          requestError.message ||
            "Failed to open device assignment"
        );
      }
    };

  const filteredLogicalDevices =
    useMemo(() => {
      const query =
        discoverySearch
          .trim()
          .toLowerCase();

      if (!query) {
        return logicalDevices;
      }

      return logicalDevices.filter(
        (device) =>
          [
            device
              .device_type_label,
            device.tag_value,
            ...(
              device
                .measurement_names ||
              []
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      logicalDevices,
      discoverySearch,
    ]);

  const groupedDiscovery =
    useMemo(() => {
      const map =
        new Map();

      filteredLogicalDevices.forEach(
        (device) => {
          if (
            !map.has(
              device.device_type
            )
          ) {
            map.set(
              device.device_type,
              {
                key:
                  device.device_type,
                label:
                  device
                    .device_type_label,
                devices: [],
              }
            );
          }

          map
            .get(
              device.device_type
            )
            .devices.push(
              device
            );
        }
      );

      return [
        ...map.values(),
      ].sort((a, b) =>
        a.label.localeCompare(
          b.label
        )
      );
    }, [
      filteredLogicalDevices,
    ]);

  const selectableVisibleKeys =
    filteredLogicalDevices
      .filter(
        (device) =>
          !getAssignmentProgress(
            device
          ).complete
      )
      .map(
        (device) =>
          device.key
      );

  const allVisibleSelected =
    selectableVisibleKeys.length >
      0 &&
    selectableVisibleKeys.every(
      (key) =>
        selectedLogicalKeys.includes(
          key
        )
    );

  const toggleLogicalDevice =
    (device) => {
      if (
        getAssignmentProgress(
          device
        ).complete
      ) {
        return;
      }

      setSelectedLogicalKeys(
        (current) =>
          current.includes(
            device.key
          )
            ? current.filter(
                (key) =>
                  key !==
                  device.key
              )
            : [
                ...current,
                device.key,
              ]
      );
    };

  const toggleVisible =
    () => {
      if (
        allVisibleSelected
      ) {
        setSelectedLogicalKeys(
          (current) =>
            current.filter(
              (key) =>
                !selectableVisibleKeys.includes(
                  key
                )
            )
        );

        return;
      }

      setSelectedLogicalKeys(
        (current) => [
          ...new Set([
            ...current,
            ...selectableVisibleKeys,
          ]),
        ]
      );
    };

  const assignSelected =
    async () => {
      if (!selectedOrgId) {
        setError(
          "Select an organization first."
        );
        return;
      }

      const selected =
        logicalDevices.filter(
          (device) =>
            selectedLogicalKeys.includes(
              device.key
            )
        );

      if (!selected.length) {
        setError(
          "Select at least one logical device."
        );
        return;
      }

      setSaving(true);
      setError("");

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/organization-influx-devices/bulk-logical`,
            {
              method: "POST",
              headers:
                headers(true),
              body: JSON.stringify({
                org_id:
                  selectedOrgId,
                devices:
                  selected.map(
                    (device) => ({
                      device_type:
                        device
                          .device_type,
                      bucket_name:
                        device
                          .bucket_name,
                      tag_key:
                        device
                          .tag_key,
                      tag_value:
                        device
                          .tag_value,
                      measurement_names:
                        device
                          .measurement_names,
                      device_name:
                        `${
                          device
                            .device_type_label
                        } · ${
                          device
                            .tag_value
                        }`,
                    })
                  ),
              }),
            }
          );

        const payload =
          await readPayload(
            response,
            "Failed to assign logical devices"
          );

        setNotice(
          `${
            payload.assigned ||
            0
          } measurement permission(s) added${
            payload.skipped
              ? ` · ${payload.skipped} already existed`
              : ""
          }.`
        );

        setSelectedLogicalKeys(
          []
        );

        await loadPage();

        setShowAssignModal(
          false
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.message ||
            "Failed to assign devices"
        );
      } finally {
        setSaving(false);
      }
    };

  const removeLogicalAssignment =
    async (item) => {
      const confirmed =
        window.confirm(
          `Remove ${item.device_type_label} ${item.tag_value} from ${item.org_name}? This removes ${item.assignment_ids.length} measurement permission(s).`
        );

      if (!confirmed) {
        return;
      }

      setError("");

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/organization-influx-devices/bulk-remove`,
            {
              method: "POST",
              headers:
                headers(true),
              body: JSON.stringify({
                assignment_ids:
                  item
                    .assignment_ids,
              }),
            }
          );

        await readPayload(
          response,
          "Failed to remove logical device"
        );

        setAssignments(
          (current) =>
            current.filter(
              (row) =>
                !item.assignment_ids.includes(
                  row.id
                )
            )
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.message ||
            "Failed to remove logical device"
        );
      }
    };

  if (!isSuperadmin) {
    return (
      <div className="p-3">
        <div
          className="
            rounded-xl border
            border-amber-200
            bg-amber-50 p-3
            text-xs text-amber-800
          "
        >
          Device Management is
          available to Superadmin.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        min-h-full w-full
        overflow-auto p-3
        ${
          dark
            ? "text-slate-100"
            : "text-slate-900"
        }
      `}
    >
      {/* HEADER */}
      <div
        className={`
          mb-3 rounded-xl border
          px-3 py-2.5 shadow-sm
          ${
            dark
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white"
          }
        `}
      >
        <div
          className="
            flex flex-col gap-2
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div
            className="
              flex min-w-0
              items-center gap-2.5
            "
          >
            <div
              className="
                flex h-8 w-8
                shrink-0 items-center
                justify-center
                rounded-lg
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/10
                dark:text-emerald-300
              "
            >
              <ServerCog
                size={16}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg font-bold">
                Device Management
              </h1>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Assign a logical device once; the system creates the required measurement-level permissions automatically.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              openAssignModal
            }
            className="
              inline-flex h-8
              shrink-0 items-center
              justify-center gap-1.5
              rounded-lg
              bg-emerald-600
              px-3 text-xs
              font-semibold text-white
              hover:bg-emerald-700
            "
          >
            <Plus size={14} />
            Assign Devices
          </button>
        </div>
      </div>

      {(error || notice) && (
        <div
          className={`
            mb-3 rounded-xl
            border px-3 py-2
            text-xs
            ${
              error
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            }
          `}
        >
          {error || notice}
        </div>
      )}

      {/* FILTERS */}
      <div
        className={`
          mb-3 grid gap-2
          rounded-xl border p-3
          md:grid-cols-[220px_minmax(0,1fr)]
          ${
            dark
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white"
          }
        `}
      >
        <select
          value={
            assignmentOrgFilter
          }
          onChange={(event) =>
            setAssignmentOrgFilter(
              event.target.value
            )
          }
          className={`
            h-9 rounded-lg
            border px-3
            text-xs outline-none
            ${
              dark
                ? "border-slate-700 bg-slate-950"
                : "border-slate-300 bg-white"
            }
          `}
        >
          <option value="">
            All organizations
          </option>

          {organizations.map(
            (organization) => (
              <option
                key={
                  organization.id
                }
                value={
                  organization.id
                }
              >
                {
                  organization.name
                }
              </option>
            )
          )}
        </select>

        <div className="relative">
          <Search
            size={14}
            className="
              absolute left-3
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            value={
              assignmentSearch
            }
            onChange={(event) =>
              setAssignmentSearch(
                event.target.value
              )
            }
            placeholder="Search assigned logical devices..."
            className={`
              h-9 w-full
              rounded-lg border
              pl-9 pr-3
              text-xs outline-none
              ${
                dark
                  ? "border-slate-700 bg-slate-950"
                  : "border-slate-300 bg-white"
              }
            `}
          />
        </div>
      </div>

      {/* CURRENT LOGICAL ASSIGNMENTS */}
      <div
        className={`
          overflow-hidden
          rounded-xl border
          ${
            dark
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white"
          }
        `}
      >
        <div
          className={`
            hidden border-b
            px-3 py-2
            text-[10px] font-bold
            uppercase tracking-wider
            md:grid
            md:grid-cols-[minmax(150px,1fr)_minmax(180px,1.1fr)_minmax(220px,1.5fr)_100px_38px]
            md:gap-3
            ${
              dark
                ? "border-slate-700 text-slate-400"
                : "border-slate-200 text-slate-400"
            }
          `}
        >
          <span>
            Organization
          </span>
          <span>
            Logical Device
          </span>
          <span>
            Measurements
          </span>
          <span>
            Access
          </span>
          <span />
        </div>

        {loading ? (
          <div
            className="
              p-8 text-center
              text-xs text-slate-400
            "
          >
            Loading assignments...
          </div>
        ) : filteredAssignments.length ===
          0 ? (
          <div
            className="
              p-8 text-center
              text-xs text-slate-400
            "
          >
            No logical-device assignments found.
          </div>
        ) : (
          filteredAssignments.map(
            (item) => (
              <div
                key={
                  item.key
                }
                className={`
                  grid gap-2
                  border-b px-3
                  py-2.5
                  last:border-b-0
                  md:grid-cols-[minmax(150px,1fr)_minmax(180px,1.1fr)_minmax(220px,1.5fr)_100px_38px]
                  md:items-center
                  md:gap-3
                  ${
                    dark
                      ? "border-slate-800"
                      : "border-slate-100"
                  }
                `}
              >
                <div>
                  <p
                    className="
                      text-[9px] font-bold
                      uppercase tracking-wider
                      text-slate-400 md:hidden
                    "
                  >
                    Organization
                  </p>

                  <p className="truncate text-xs font-semibold">
                    {
                      item.org_name
                    }
                  </p>
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      text-[9px] font-bold
                      uppercase tracking-wider
                      text-slate-400 md:hidden
                    "
                  >
                    Logical Device
                  </p>

                  <p className="truncate text-xs font-semibold">
                    {
                      item
                        .device_type_label
                    }
                  </p>

                  <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400">
                    {
                      item.tag_value
                    }
                  </p>
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      text-[9px] font-bold
                      uppercase tracking-wider
                      text-slate-400 md:hidden
                    "
                  >
                    Measurements
                  </p>

                  <div
                    className="
                      flex flex-wrap
                      gap-1
                    "
                  >
                    {item
                      .measurement_names
                      .slice(0, 4)
                      .map(
                        (
                          measurement
                        ) => (
                          <span
                            key={
                              measurement
                            }
                            className="
                              rounded-md
                              bg-slate-100
                              px-1.5 py-0.5
                              font-mono
                              text-[9px]
                              text-slate-500
                              dark:bg-slate-800
                              dark:text-slate-300
                            "
                          >
                            {
                              measurement
                            }
                          </span>
                        )
                      )}

                    {item
                      .measurement_names
                      .length > 4 && (
                      <span
                        className="
                          rounded-md
                          bg-slate-100
                          px-1.5 py-0.5
                          text-[9px]
                          text-slate-400
                          dark:bg-slate-800
                        "
                      >
                        +
                        {item
                          .measurement_names
                          .length -
                          4}{" "}
                        more
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span
                    className="
                      inline-flex
                      rounded-full
                      bg-emerald-50
                      px-2 py-1
                      text-[9px] font-bold
                      text-emerald-700
                      dark:bg-emerald-500/10
                      dark:text-emerald-300
                    "
                  >
                    {
                      item
                        .measurement_count
                    }{" "}
                    allowed
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeLogicalAssignment(
                      item
                    )
                  }
                  className="
                    flex h-8 w-8
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    hover:bg-red-50
                    hover:text-red-500
                    dark:hover:bg-red-500/10
                  "
                  title="Remove logical device"
                >
                  <Trash2
                    size={14}
                  />
                </button>
              </div>
            )
          )
        )}
      </div>

      {/* BULK LOGICAL ASSIGNMENT MODAL */}
      {showAssignModal && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center
            justify-center
            bg-black/60 p-3
            backdrop-blur-sm
          "
          onClick={() =>
            setShowAssignModal(
              false
            )
          }
        >
          <div
            className={`
              flex max-h-[92vh]
              w-full max-w-4xl
              flex-col overflow-hidden
              rounded-2xl border
              shadow-2xl
              ${
                dark
                  ? "border-slate-700 bg-slate-900"
                  : "border-slate-200 bg-white"
              }
            `}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}
            <div
              className={`
                flex shrink-0
                items-center
                justify-between
                border-b px-4
                py-3
                ${
                  dark
                    ? "border-slate-700"
                    : "border-slate-200"
                }
              `}
            >
              <div>
                <h2 className="text-base font-bold">
                  Assign Logical Devices
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  One selection can contain several measurement permissions.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAssignModal(
                    false
                  )
                }
                className="
                  rounded-lg p-1.5
                  text-slate-400
                  hover:bg-slate-100
                  dark:hover:bg-slate-800
                "
              >
                <X size={17} />
              </button>
            </div>

            {/* MODAL FILTERS */}
            <div
              className={`
                shrink-0 border-b
                px-4 py-3
                ${
                  dark
                    ? "border-slate-700"
                    : "border-slate-200"
                }
              `}
            >
              <div
                className="
                  grid gap-2
                  md:grid-cols-[1fr_220px_auto]
                "
              >
                <select
                  value={
                    selectedOrgId
                  }
                  onChange={(event) => {
                    setSelectedOrgId(
                      event.target.value
                    );

                    setSelectedLogicalKeys(
                      []
                    );
                  }}
                  className={`
                    h-9 rounded-lg
                    border px-3
                    text-xs
                    ${
                      dark
                        ? "border-slate-700 bg-slate-950"
                        : "border-slate-300 bg-white"
                    }
                  `}
                >
                  <option value="">
                    Select organization
                  </option>

                  {organizations.map(
                    (organization) => (
                      <option
                        key={
                          organization.id
                        }
                        value={
                          organization.id
                        }
                      >
                        {
                          organization.name
                        }
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    selectedBucket
                  }
                  onChange={async (
                    event
                  ) => {
                    const value =
                      event.target
                        .value;

                    setSelectedBucket(
                      value
                    );

                    setSelectedLogicalKeys(
                      []
                    );

                    await discoverLogicalDevices(
                      value
                    );
                  }}
                  className={`
                    h-9 rounded-lg
                    border px-3
                    font-mono text-xs
                    ${
                      dark
                        ? "border-slate-700 bg-slate-950"
                        : "border-slate-300 bg-white"
                    }
                  `}
                >
                  {availableBuckets.map(
                    (bucketName) => (
                      <option
                        key={
                          bucketName
                        }
                        value={
                          bucketName
                        }
                      >
                        {
                          bucketName
                        }
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    discoverLogicalDevices(
                      selectedBucket
                    )
                  }
                  disabled={
                    discoveryLoading ||
                    !selectedBucket
                  }
                  className="
                    inline-flex h-9
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    bg-slate-800
                    px-3 text-xs
                    font-semibold
                    text-white
                    disabled:opacity-50
                  "
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

              <div
                className="
                  mt-2 flex
                  flex-col gap-2
                  sm:flex-row
                  sm:items-center
                "
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={13}
                    className="
                      absolute left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    value={
                      discoverySearch
                    }
                    onChange={(event) =>
                      setDiscoverySearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search type, device ID, measurement..."
                    className={`
                      h-9 w-full
                      rounded-lg border
                      pl-9 pr-3
                      text-xs
                      ${
                        dark
                          ? "border-slate-700 bg-slate-950"
                          : "border-slate-300 bg-white"
                      }
                    `}
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    toggleVisible
                  }
                  disabled={
                    !selectedOrgId ||
                    !selectableVisibleKeys.length
                  }
                  className="
                    inline-flex h-9
                    shrink-0 items-center
                    justify-center
                    gap-1.5 rounded-lg
                    border border-slate-300
                    px-3 text-xs
                    font-semibold
                    disabled:opacity-50
                    dark:border-slate-700
                  "
                >
                  <Check size={13} />
                  {allVisibleSelected
                    ? "Clear Visible"
                    : "Select Visible"}
                </button>
              </div>
            </div>

            {/* DEVICE CARDS */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!selectedOrgId ? (
                <div
                  className="
                    p-10 text-center
                    text-xs text-slate-400
                  "
                >
                  Select an organization to see assignment status.
                </div>
              ) : discoveryLoading ? (
                <div
                  className="
                    p-10 text-center
                    text-xs text-slate-400
                  "
                >
                  Discovering measurement + device-ID relationships...
                </div>
              ) : groupedDiscovery.length ===
                0 ? (
                <div
                  className="
                    p-10 text-center
                    text-xs text-slate-400
                  "
                >
                  No logical devices found.
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedDiscovery.map(
                    (group) => (
                      <section
                        key={
                          group.key
                        }
                      >
                        <div
                          className="
                            mb-2 flex
                            items-center
                            justify-between
                          "
                        >
                          <div
                            className="
                              flex items-center
                              gap-2
                            "
                          >
                            <Layers3
                              size={14}
                              className="text-emerald-500"
                            />

                            <h3 className="text-xs font-bold">
                              {
                                group.label
                              }
                            </h3>
                          </div>

                          <span className="text-[10px] text-slate-400">
                            {
                              group
                                .devices
                                .length
                            }{" "}
                            device(s)
                          </span>
                        </div>

                        <div
                          className="
                            grid gap-2
                            md:grid-cols-2
                          "
                        >
                          {group.devices.map(
                            (
                              device
                            ) => {
                              const progress =
                                getAssignmentProgress(
                                  device
                                );

                              const selected =
                                selectedLogicalKeys.includes(
                                  device.key
                                );

                              return (
                                <button
                                  key={
                                    device.key
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleLogicalDevice(
                                      device
                                    )
                                  }
                                  disabled={
                                    progress.complete
                                  }
                                  className={`
                                    flex min-w-0
                                    items-start gap-3
                                    rounded-xl border
                                    p-3 text-left
                                    transition-colors
                                    ${
                                      progress.complete
                                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-950"
                                        : selected
                                        ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                                        : dark
                                        ? "border-slate-700 bg-slate-950 hover:border-emerald-500/40"
                                        : "border-slate-200 bg-white hover:border-emerald-300"
                                    }
                                  `}
                                >
                                  <span
                                    className={`
                                      mt-0.5 flex
                                      h-5 w-5
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-md border
                                      ${
                                        selected
                                          ? "border-emerald-500 bg-emerald-600 text-white"
                                          : "border-slate-300 text-transparent dark:border-slate-600"
                                      }
                                    `}
                                  >
                                    <Check
                                      size={12}
                                    />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span
                                      className="
                                        block truncate
                                        font-mono
                                        text-[11px]
                                        font-bold
                                      "
                                    >
                                      {
                                        device
                                          .tag_value
                                      }
                                    </span>

                                    <span className="mt-1 block text-[10px] text-slate-400">
                                      {
                                        device
                                          .measurement_count
                                      }{" "}
                                      measurement(s)
                                    </span>

                                    <span
                                      className="
                                        mt-1 block
                                        truncate
                                        text-[9px]
                                        text-slate-400
                                      "
                                    >
                                      {(
                                        device
                                          .measurement_names ||
                                        []
                                      )
                                        .slice(
                                          0,
                                          5
                                        )
                                        .join(
                                          " · "
                                        )}

                                      {(device
                                        .measurement_names ||
                                        [])
                                        .length >
                                      5
                                        ? " …"
                                        : ""}
                                    </span>

                                    {progress.complete ? (
                                      <span
                                        className="
                                          mt-1.5
                                          inline-flex
                                          rounded-full
                                          bg-emerald-100
                                          px-2 py-0.5
                                          text-[9px]
                                          font-bold
                                          text-emerald-700
                                          dark:bg-emerald-500/10
                                          dark:text-emerald-300
                                        "
                                      >
                                        Fully assigned
                                      </span>
                                    ) : progress.partial ? (
                                      <span
                                        className="
                                          mt-1.5
                                          inline-flex
                                          rounded-full
                                          bg-amber-100
                                          px-2 py-0.5
                                          text-[9px]
                                          font-bold
                                          text-amber-700
                                          dark:bg-amber-500/10
                                          dark:text-amber-300
                                        "
                                      >
                                        {
                                          progress.assignedCount
                                        }
                                        /
                                        {
                                          progress.total
                                        }{" "}
                                        already assigned
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </section>
                    )
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div
              className={`
                flex shrink-0
                items-center
                justify-between
                gap-3 border-t
                px-4 py-3
                ${
                  dark
                    ? "border-slate-700"
                    : "border-slate-200"
                }
              `}
            >
              <p className="text-[11px] text-slate-400">
                {
                  selectedLogicalKeys.length
                }{" "}
                logical device(s) selected
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowAssignModal(
                      false
                    )
                  }
                  className="
                    h-9 rounded-lg
                    border
                    border-slate-300
                    px-4 text-xs
                    font-semibold
                    dark:border-slate-700
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    assignSelected
                  }
                  disabled={
                    saving ||
                    !selectedOrgId ||
                    selectedLogicalKeys.length ===
                      0
                  }
                  className="
                    h-9 rounded-lg
                    bg-emerald-600
                    px-4 text-xs
                    font-semibold
                    text-white
                    disabled:opacity-50
                  "
                >
                  {saving
                    ? "Assigning..."
                    : `Assign ${
                        selectedLogicalKeys.length
                      } Device${
                        selectedLogicalKeys.length ===
                        1
                          ? ""
                          : "s"
                      }`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
