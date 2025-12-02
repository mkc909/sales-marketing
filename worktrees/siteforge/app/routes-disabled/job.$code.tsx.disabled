/**
 * Customer Job Portal
 *
 * Public view for customers to track their service jobs using unique 6-character codes
 * Supports bilingual display (English/Spanish)
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import {
  getJobByCode,
  getJobHistory,
  getCustomerJobData,
} from "~/lib/job-tracking";
import { listJobPayments } from "~/lib/ath-movil";
import { listJobCommunications } from "~/lib/communications";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const jobCode = data?.job?.job_code || "Job";
  return [
    { title: `Track Job ${jobCode} | ServiceOS` },
    { name: "description", content: "Track your service job in real-time" },
  ];
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { code } = params;

  if (!code) {
    throw new Response("Job code required", { status: 400 });
  }

  try {
    const job = await getJobByCode(context, code);
    const history = await getJobHistory(context, job.id);
    const payments = await listJobPayments(context, job.id);
    const communications = await listJobCommunications(context, job.id);

    // Only return customer-safe data
    const customerJob = getCustomerJobData(job);

    return json({
      job: customerJob,
      history,
      payments: payments.filter((p) => p.payment_status !== "failed"),
      communications: communications.filter((c) => c.direction === "outbound"),
    });
  } catch (error: any) {
    throw new Response(error.message || "Job not found", { status: 404 });
  }
}

export default function JobTracking() {
  const { job, history, payments, communications } = useLoaderData<typeof loader>();

  // Detect language preference (could be from browser or URL param)
  const lang = "en"; // Default to English, could detect from navigator.language

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t.job} {job.job_code}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t.created} {new Date(job.created_at).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={job.status} lang={lang} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Service Details */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t.serviceDetails}</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">{t.serviceType}</dt>
              <dd className="mt-1 text-sm text-gray-900">{job.service_type}</dd>
            </div>
            {job.service_description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">{t.description}</dt>
                <dd className="mt-1 text-sm text-gray-900">{job.service_description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">{t.customerName}</dt>
              <dd className="mt-1 text-sm text-gray-900">{job.customer_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t.address}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {job.customer_address}, {job.customer_city}
              </dd>
            </div>
            {job.scheduled_date && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t.scheduledDate}</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(job.scheduled_date).toLocaleDateString()}
                  </dd>
                </div>
                {job.scheduled_time_start && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t.scheduledTime}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {job.scheduled_time_start}
                      {job.scheduled_time_end && ` - ${job.scheduled_time_end}`}
                    </dd>
                  </div>
                )}
              </>
            )}
            {job.priority && job.priority !== "normal" && (
              <div>
                <dt className="text-sm font-medium text-gray-500">{t.priority}</dt>
                <dd className="mt-1">
                  <PriorityBadge priority={job.priority} lang={lang} />
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Status Timeline */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t.statusHistory}</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {history.map((entry, idx) => (
                <li key={entry.id}>
                  <div className="relative pb-8">
                    {idx !== history.length - 1 && (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <StatusIcon status={entry.new_status} />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-900">
                            {t.statuses[entry.new_status as keyof typeof t.statuses] || entry.new_status}
                          </p>
                          {entry.notes && (
                            <p className="mt-1 text-sm text-gray-500">{entry.notes}</p>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment Information */}
        {job.total_amount > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{t.payment}</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">{t.totalAmount}</p>
                <p className="text-2xl font-bold text-gray-900">${job.total_amount.toFixed(2)}</p>
              </div>
              <PaymentStatusBadge status={job.payment_status} lang={lang} />
            </div>

            {job.payment_status === "unpaid" && payments.length > 0 && (
              <div className="mt-4">
                <a
                  href={`/api/payment/${job.job_code}/ath-movil`}
                  className="block w-full bg-purple-600 text-white text-center py-3 px-4 rounded-lg hover:bg-purple-700 transition"
                >
                  {t.payWithATH}
                </a>
              </div>
            )}

            {payments.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t.paymentHistory}</h3>
                <ul className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <li key={payment.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            ${payment.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.payment_method} - {payment.payment_status}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {payment.processed_at
                            ? new Date(payment.processed_at).toLocaleDateString()
                            : new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {job.photos_urls && job.photos_urls.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{t.photos}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {job.photos_urls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Job photo ${idx + 1}`}
                  className="rounded-lg object-cover aspect-square"
                />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{t.notes}</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper Components
function StatusBadge({ status, lang }: { status: string; lang: "en" | "es" }) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    assigned: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const t = translations[lang];

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}>
      {t.statuses[status as keyof typeof t.statuses] || status}
    </span>
  );
}

function PriorityBadge({ priority, lang }: { priority: string; lang: "en" | "es" }) {
  const colors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  const t = translations[lang];

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}>
      {t.priorities[priority as keyof typeof t.priorities] || priority}
    </span>
  );
}

function PaymentStatusBadge({ status, lang }: { status: string; lang: "en" | "es" }) {
  const colors = {
    unpaid: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    refunded: "bg-gray-100 text-gray-800",
  };

  const t = translations[lang];

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}>
      {t.paymentStatuses[status as keyof typeof t.paymentStatuses] || status}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  const icons = {
    pending: "⏱️",
    assigned: "👤",
    in_progress: "🔧",
    completed: "✅",
    cancelled: "❌",
  };

  return <span className="text-white">{icons[status as keyof typeof icons] || "📋"}</span>;
}

// Translations
const translations = {
  en: {
    job: "Job",
    created: "Created",
    serviceDetails: "Service Details",
    serviceType: "Service Type",
    description: "Description",
    customerName: "Customer Name",
    address: "Address",
    scheduledDate: "Scheduled Date",
    scheduledTime: "Scheduled Time",
    priority: "Priority",
    statusHistory: "Status History",
    payment: "Payment",
    totalAmount: "Total Amount",
    payWithATH: "Pay with ATH Móvil",
    paymentHistory: "Payment History",
    photos: "Photos",
    notes: "Notes",
    statuses: {
      pending: "Pending",
      assigned: "Assigned",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    priorities: {
      low: "Low",
      normal: "Normal",
      high: "High",
      urgent: "Urgent",
    },
    paymentStatuses: {
      unpaid: "Unpaid",
      pending: "Pending",
      paid: "Paid",
      refunded: "Refunded",
    },
  },
  es: {
    job: "Trabajo",
    created: "Creado",
    serviceDetails: "Detalles del Servicio",
    serviceType: "Tipo de Servicio",
    description: "Descripción",
    customerName: "Nombre del Cliente",
    address: "Dirección",
    scheduledDate: "Fecha Programada",
    scheduledTime: "Hora Programada",
    priority: "Prioridad",
    statusHistory: "Historial de Estado",
    payment: "Pago",
    totalAmount: "Monto Total",
    payWithATH: "Pagar con ATH Móvil",
    paymentHistory: "Historial de Pagos",
    photos: "Fotos",
    notes: "Notas",
    statuses: {
      pending: "Pendiente",
      assigned: "Asignado",
      in_progress: "En Progreso",
      completed: "Completado",
      cancelled: "Cancelado",
    },
    priorities: {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente",
    },
    paymentStatuses: {
      unpaid: "No Pagado",
      pending: "Pendiente",
      paid: "Pagado",
      refunded: "Reembolsado",
    },
  },
};
