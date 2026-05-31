import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { facilitiesSchema, FacilitiesFormData } from '../../schemas/validation';
import { Input, Select, TextArea, Button, Alert } from '../common/FormComponents';
import {
  useUpdateFacilities,
  useFacilitiesResources,
} from '../../hooks/useApi';
import { Loader, AlertCircle } from 'lucide-react';

export const FacilitiesTab: React.FC<{ showEmergencyEquipment?: boolean }> = ({ showEmergencyEquipment }) => {
  const { mutate: updateFacilities, isPending, isSuccess, isError } = useUpdateFacilities();
  const { data: resources, isLoading: isLoadingData } = useFacilitiesResources();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FacilitiesFormData>({
    resolver: zodResolver(facilitiesSchema),
    defaultValues: {
      resourceName: 'Oxygen',
      resourceStatus: 'Available',
      quantityAvailable: 0,
      quantityInUse: 0,
      maintenanceLogs: '',
      lastMaintenanceDate: new Date().toISOString().slice(0, 16),
    },
  });

  const onSubmit = (data: FacilitiesFormData) => {
    updateFacilities(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  const resourceNames = [
    { value: 'Oxygen', label: 'Oxygen' },
    { value: 'Ventilators', label: 'Ventilators' },
    { value: 'Beds', label: 'Hospital Beds' },
    { value: 'Wheelchairs', label: 'Wheelchairs' },
    { value: 'Monitors', label: 'Monitors' },
    { value: 'Pumps', label: 'Infusion Pumps' },
  ];

  const statusColors = {
    Available: 'bg-green-100 text-green-800 border-green-300',
    'In-use': 'bg-blue-100 text-blue-800 border-blue-300',
    Maintenance: 'bg-red-100 text-red-800 border-red-300',
  };

  const getUtilizationStatus = (available: number, inUse: number) => {
    const total = available + inUse;
    if (total === 0) return 0;
    return Math.round((inUse / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Facilities & Logistics
        </h2>
        <p className="text-gray-600">
          Monitor and manage hospital resources, maintenance schedules, and logistics
        </p>
      </div>

      {isSuccess && (
        <Alert type="success" message="Facility data updated successfully" />
      )}
      {isError && (
        <Alert type="error" message="Failed to update facility data" />
      )}

      {/* Resource Update Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Update Resource Status
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="resourceName"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Resource Name"
                  required
                  options={resourceNames}
                  error={errors.resourceName}
                />
              )}
            />

            <Controller
              name="resourceStatus"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Current Status"
                  required
                  options={[
                    { value: 'Available', label: 'Available' },
                    { value: 'In-use', label: 'In-use' },
                    { value: 'Maintenance', label: 'Maintenance' },
                  ]}
                  error={errors.resourceStatus}
                />
              )}
            />

            <Controller
              name="quantityAvailable"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Quantity Available"
                  type="number"
                  required
                  error={errors.quantityAvailable}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              )}
            />

            <Controller
              name="quantityInUse"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Quantity In-Use"
                  type="number"
                  required
                  error={errors.quantityInUse}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              )}
            />

            <Controller
              name="lastMaintenanceDate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Last Maintenance Date"
                  type="datetime-local"
                  error={errors.lastMaintenanceDate}
                />
              )}
            />

            <Controller
              name="nextScheduledMaintenance"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Next Scheduled Maintenance"
                  type="datetime-local"
                  error={errors.nextScheduledMaintenance}
                />
              )}
            />
          </div>

          <Controller
            name="maintenanceLogs"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                label="Maintenance Logs"
                placeholder="Log any maintenance activities, issues, or repairs..."
                rows={4}
                error={errors.maintenanceLogs}
              />
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isPending}>
              Update Status
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset()}
              disabled={isPending}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      {/* Emergency Equipment Path */}
      {showEmergencyEquipment && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Emergency Equipment - Command Mode
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <h4 className="font-semibold text-red-700 mb-2">Nearest Defibrillator</h4>
              <p className="text-gray-700">Location: Ward 3, Station 2</p>
              <p className="text-gray-700">Distance: 50 meters</p>
              <p className="text-gray-700">Status: Available</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <h4 className="font-semibold text-red-700 mb-2">Emergency Cart</h4>
              <p className="text-gray-700">Location: Hallway A, Cart 5</p>
              <p className="text-gray-700">Distance: 30 meters</p>
              <p className="text-gray-700">Status: Available</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <h4 className="font-semibold text-red-700 mb-2">Oxygen Tank</h4>
              <p className="text-gray-700">Location: Storage Room B</p>
              <p className="text-gray-700">Distance: 75 meters</p>
              <p className="text-gray-700">Status: Available</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <h4 className="font-semibold text-red-700 mb-2">Ambulance Bay</h4>
              <p className="text-gray-700">Location: Emergency Entrance</p>
              <p className="text-gray-700">Distance: 200 meters</p>
              <p className="text-gray-700">Status: Clear</p>
            </div>
          </div>
        </div>
      )}

      {/* Resources Monitoring Panel */}
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resource Monitoring Panel
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources && resources.length > 0 ? (
              resources.map((resource: any, idx: number) => {
                const utilization = getUtilizationStatus(
                  resource.quantityAvailable,
                  resource.quantityInUse
                );
                const total = resource.quantityAvailable + resource.quantityInUse;

                return (
                  <div
                    key={idx}
                    className={`border-2 rounded-lg p-4 ${
                      statusColors[
                        resource.resourceStatus as keyof typeof statusColors
                      ]
                    }`}
                  >
                    <div className="mb-3">
                      <h4 className="font-semibold text-lg">{resource.resourceName}</h4>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                          resource.resourceStatus === 'Available'
                            ? 'bg-green-200'
                            : resource.resourceStatus === 'In-use'
                            ? 'bg-blue-200'
                            : 'bg-red-200'
                        }`}
                      >
                        {resource.resourceStatus}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Total Units: {total}</span>
                        <span className="font-semibold">{utilization}% in use</span>
                      </div>

                      {/* Utilization Bar */}
                      <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            utilization > 80
                              ? 'bg-red-500'
                              : utilization > 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs mt-2">
                        <span>
                          <span className="font-medium text-green-700">
                            {resource.quantityAvailable}
                          </span>{' '}
                          available
                        </span>
                        <span>
                          <span className="font-medium text-blue-700">
                            {resource.quantityInUse}
                          </span>{' '}
                          in use
                        </span>
                      </div>
                    </div>

                    {resource.nextScheduledMaintenance && (
                      <div className="text-xs text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                        <span className="font-medium">Next maintenance:</span>
                        <br />
                        {new Date(
                          resource.nextScheduledMaintenance
                        ).toLocaleDateString()}
                      </div>
                    )}

                    {resource.maintenanceLogs && (
                      <div className="text-xs text-gray-700 bg-white bg-opacity-50 p-2 rounded mt-2">
                        <span className="font-medium">Latest log:</span>
                        <p className="mt-1 line-clamp-2">
                          {resource.maintenanceLogs}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2 text-gray-400" size={32} />
                <p>No resources configured</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
