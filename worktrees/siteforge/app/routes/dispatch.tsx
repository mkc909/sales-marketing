/**
 * Dispatch Dashboard
 *
 * Internal dashboard for managing technicians, assigning jobs, route optimization,
 * and real-time job tracking. Requires authentication.
 */

import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData, useFetcher, Form } from "@remix-run/react";
import { useState } from "react";
import { listJobs, updateJob, getJobStats } from "~/lib/job-tracking";
import { getTenantByHostname } from "~/lib/tenant.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Dispatch Dashboard | ServiceOS" },
    { name: "description", content: "Manage technicians and job assignments" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Get tenant from hostname
  const hostname = new URL(request.url).hostname;
  const tenant = await getTenantByHostname(hostname, context);

  if (!tenant) {
    throw new Response("Tenant not found", { status: 404 });
  }

  // TODO: Add authentication check here
  // For now, anyone can access the dispatch dashboard

  // Get today's date for default filter
  const today = new Date().toISOString().split("T")[0];

  // Fetch jobs for today
  const jobs = await listJobs(context, tenant.id, {
    date_from: today,
  });

  // Fetch technicians
  const techniciansResult = await context.env.DB.prepare(
    "SELECT * FROM technicians WHERE tenant_id = ? AND status = 'active' ORDER BY first_name, last_name"
  )
    .bind(tenant.id)
    .all<any>();

  const technicians = techniciansResult.results || [];

  // Parse JSON fields
  technicians.forEach((tech) => {
    if (tech.specializations && typeof tech.specializations === "string") {
      tech.specializations = JSON.parse(tech.specializations);
    }
    if (tech.certifications && typeof tech.certifications === "string") {
      tech.certifications = JSON.parse(tech.certifications);
    }
    if (tech.service_regions && typeof tech.service_regions === "string") {
      tech.service_regions = JSON.parse(tech.service_regions);
    }
    if (tech.languages && typeof tech.languages === "string") {
      tech.languages = JSON.parse(tech.languages);
    }
  });

  // Get job statistics
  const stats = await getJobStats(context, tenant.id);

  return json({
    tenant,
    jobs,
    technicians,
    stats,
    today,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");

  try {
    switch (action) {
      case "assign_technician": {
        const jobId = formData.get("job_id") as string;
        const technicianId = formData.get("technician_id") as string;

        await updateJob(
          context,
          jobId,
          {
            technician_id: technicianId,
            status: "assigned",
          },
          "dispatch_admin",
          "admin"
        );

        return json({ success: true, message: "Technician assigned successfully" });
      }

      case "update_status": {
        const jobId = formData.get("job_id") as string;
        const status = formData.get("status") as any;

        await updateJob(
          context,
          jobId,
          { status },
          "dispatch_admin",
          "admin"
        );

        return json({ success: true, message: "Status updated successfully" });
      }

      case "update_schedule": {
        const jobId = formData.get("job_id") as string;
        const scheduledDate = formData.get("scheduled_date") as string;
        const scheduledTimeStart = formData.get("scheduled_time_start") as string;
        const scheduledTimeEnd = formData.get("scheduled_time_end") as string;

        await updateJob(
          context,
          jobId,
          {
            scheduled_date: scheduledDate,
            scheduled_time_start: scheduledTimeStart,
            scheduled_time_end: scheduledTimeEnd,
          },
          "dispatch_admin",
          "admin"
        );

        return json({ success: true, message: "Schedule updated successfully" });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Dispatch action error:", error);
    return json({ error: error.message || "Action failed" }, { status: 500 });
  }
}

export default function DispatchDashboard() {
  const { tenant, jobs, technicians, stats, today } = useLoaderData<typeof loader>();
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  // Filter jobs based on selected filters
  const filteredJobs = jobs.filter((job) => {
    if (filterStatus !== "all" && job.status !== filterStatus) return false;
    return true;
  });

  // Group jobs by status
  const jobsByStatus = {
    pending: filteredJobs.filter((j) => j.status === "pending"),
    assigned: filteredJobs.filter((j) => j.status === "assigned"),
    in_progress: filteredJobs.filter((j) => j.status === "in_progress"),
    completed: filteredJobs.filter((j) => j.status === "completed"),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dispatch Dashboard</h1>
              <p className="text-sm text-gray-500">{tenant.business_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Jobs"
            value={stats.total}
            icon="📋"
            color="blue"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon="⏱️"
            color="yellow"
          />
          <StatCard
            title="In Progress"
            value={stats.in_progress}
            icon="🔧"
            color="purple"
          />
          <StatCard
            title="Completed Today"
            value={stats.completed}
            icon="✅"
            color="green"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Columns (Kanban-style) */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <JobColumn
                title="Pending"
                jobs={jobsByStatus.pending}
                technicians={technicians}
                color="yellow"
                onSelectJob={setSelectedJob}
              />
              <JobColumn
                title="Assigned"
                jobs={jobsByStatus.assigned}
                technicians={technicians}
                color="blue"
                onSelectJob={setSelectedJob}
              />
              <JobColumn
                title="In Progress"
                jobs={jobsByStatus.in_progress}
                technicians={technicians}
                color="purple"
                onSelectJob={setSelectedJob}
              />
              <JobColumn
                title="Completed"
                jobs={jobsByStatus.completed}
                technicians={technicians}
                color="green"
                onSelectJob={setSelectedJob}
              />
            </div>
          </div>

          {/* Technicians Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Available Technicians</h2>
              <div className="space-y-3">
                {technicians.length === 0 && (
                  <p className="text-sm text-gray-500">No technicians available</p>
                )}
                {technicians.map((tech) => (
                  <TechnicianCard key={tech.id} technician={tech} jobs={jobs} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function JobColumn({
  title,
  jobs,
  technicians,
  color,
  onSelectJob,
}: {
  title: string;
  jobs: any[];
  technicians: any[];
  color: string;
  onSelectJob: (jobId: string) => void;
}) {
  const colorClasses = {
    yellow: "border-yellow-500 bg-yellow-50",
    blue: "border-blue-500 bg-blue-50",
    purple: "border-purple-500 bg-purple-50",
    green: "border-green-500 bg-green-50",
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className={`px-4 py-3 border-t-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
        <h3 className="font-semibold text-gray-900">
          {title} <span className="text-gray-500">({jobs.length})</span>
        </h3>
      </div>
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {jobs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No jobs</p>
        )}
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            technicians={technicians}
            onClick={() => onSelectJob(job.id)}
          />
        ))}
      </div>
    </div>
  );
}

function JobCard({
  job,
  technicians,
  onClick,
}: {
  job: any;
  technicians: any[];
  onClick: () => void;
}) {
  const fetcher = useFetcher();
  const assignedTech = technicians.find((t) => t.id === job.technician_id);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">{job.job_code}</p>
          <p className="text-sm text-gray-500">{job.customer_name}</p>
        </div>
        {job.priority !== "normal" && (
          <PriorityBadge priority={job.priority} />
        )}
      </div>

      <p className="text-sm text-gray-700 mb-2">{job.service_type}</p>

      {job.scheduled_time_start && (
        <p className="text-xs text-gray-500 mb-2">
          🕐 {job.scheduled_time_start}
          {job.scheduled_time_end && ` - ${job.scheduled_time_end}`}
        </p>
      )}

      <p className="text-xs text-gray-500 mb-3">
        📍 {job.customer_city}
      </p>

      {assignedTech ? (
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
            {assignedTech.first_name[0]}
          </div>
          <span className="text-gray-700">
            {assignedTech.first_name} {assignedTech.last_name}
          </span>
        </div>
      ) : (
        <fetcher.Form method="post" onClick={(e) => e.stopPropagation()}>
          <input type="hidden" name="_action" value="assign_technician" />
          <input type="hidden" name="job_id" value={job.id} />
          <select
            name="technician_id"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            onChange={(e) => {
              if (e.target.value) {
                fetcher.submit(e.currentTarget.form);
              }
            }}
          >
            <option value="">Assign technician...</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.first_name} {tech.last_name}
              </option>
            ))}
          </select>
        </fetcher.Form>
      )}
    </div>
  );
}

function TechnicianCard({ technician, jobs }: { technician: any; jobs: any[] }) {
  const assignedJobs = jobs.filter(
    (j) => j.technician_id === technician.id && j.status !== "completed"
  );

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {technician.first_name[0]}{technician.last_name[0]}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {technician.first_name} {technician.last_name}
          </p>
          <p className="text-xs text-gray-500">{technician.phone}</p>
        </div>
        <StatusDot status={technician.status} />
      </div>

      {technician.specializations && technician.specializations.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {technician.specializations.map((spec: string, idx: number) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        {assignedJobs.length} active job{assignedJobs.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors = {
    low: "bg-gray-100 text-gray-600",
    normal: "bg-blue-100 text-blue-600",
    high: "bg-orange-100 text-orange-600",
    urgent: "bg-red-100 text-red-600",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[priority as keyof typeof colors]}`}>
      {priority.toUpperCase()}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors = {
    active: "bg-green-500",
    on_break: "bg-yellow-500",
    off_duty: "bg-gray-500",
    inactive: "bg-red-500",
  };

  return (
    <span
      className={`w-3 h-3 rounded-full ${colors[status as keyof typeof colors] || "bg-gray-500"}`}
      title={status}
    />
  );
}
