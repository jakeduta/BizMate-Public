import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AppointmentCalendar({ appointments, customers, onEdit, onDelete }) {
  const getCustomerName = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Unknown";
  };

  const today = new Date().toISOString().split("T")[0];
  const upcomingAppointments = appointments.filter((apt) => apt.date >= today);
  const pastAppointments = appointments.filter((apt) => apt.date < today);

  const AppointmentCard = ({ appointment, isPast }) => (
    <Card
      key={appointment.id}
      className={`p-4 ${isPast ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">{appointment.title}</h3>
          <p className="text-sm text-gray-500">
            {getCustomerName(appointment.customer_id)}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            appointment.status === "confirmed"
              ? "bg-green-100 text-green-800"
              : appointment.status === "completed"
              ? "bg-blue-100 text-blue-800"
              : appointment.status === "cancelled"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {appointment.status}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <Clock className="w-4 h-4" />
        <span>
          {format(new Date(appointment.date), "MMM dd, yyyy")} at{" "}
          {appointment.start_time}
          {appointment.end_time && ` - ${appointment.end_time}`}
        </span>
      </div>

      {appointment.notes && (
        <p className="text-sm text-gray-600 mb-3">{appointment.notes}</p>
      )}

      <div className="flex gap-2 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(appointment)}
          className="flex-1"
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(appointment.id)}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Upcoming Appointments ({upcomingAppointments.length})
        </h2>
        {upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} isPast={false} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-gray-500">
            No upcoming appointments scheduled.
          </Card>
        )}
      </div>

      {pastAppointments.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Past Appointments ({pastAppointments.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastAppointments.slice(0, 6).map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} isPast={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}