import { BerthRecord } from '../types/berth';
import { formatDate } from '../utils/dataUtils';

interface BerthDetailPanelProps {
  berth: BerthRecord;
  onClose: () => void;
}

export default function BerthDetailPanel({ berth, onClose }: BerthDetailPanelProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Berth {berth.berth}</h2>
              <p className="text-sm text-gray-600 mt-1">Pier {berth.pier} • {berth.berthType}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Marina</p>
                  <p className="font-medium text-gray-900">{berth.marina}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Berth Status</p>
                  <p className="font-medium text-gray-900">{berth.berthStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pier</p>
                  <p className="font-medium text-gray-900">{berth.pier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Berth Type</p>
                  <p className="font-medium text-gray-900">{berth.berthType}</p>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Dimensions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nominal Length</p>
                  <p className="font-medium text-gray-900">{berth.nominalLength}m</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Actual Length</p>
                  <p className="font-medium text-gray-900">{berth.actualLength}m</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nominal Width</p>
                  <p className="font-medium text-gray-900">{berth.nominalWidth}m</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Actual Width</p>
                  <p className="font-medium text-gray-900">{berth.actualWidth}m</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nominal Depth</p>
                  <p className="font-medium text-gray-900">{berth.nominalDepth}m</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Actual Depth</p>
                  <p className="font-medium text-gray-900">{berth.actualDepth}m</p>
                </div>
              </div>
            </div>

            {/* Ownership */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Ownership</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Ownership Type</p>
                  <p className="font-medium text-gray-900">{berth.ownershipType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ownership Type ID</p>
                  <p className="font-medium text-gray-900">{berth.ownershipTypeId}</p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Occupancy Status</p>
                  <p className="font-medium text-gray-900">{berth.occupancyStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Occupied Flag</p>
                  <p className="font-medium text-gray-900">{berth.occupiedFlag ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Flag</p>
                  <p className="font-medium text-gray-900">{berth.availableFlag ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Customer & Vessel */}
            {(berth.customerName || berth.vesselName) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer & Vessel</h3>
                <div className="grid grid-cols-2 gap-4">
                  {berth.customerName && (
                    <div>
                      <p className="text-sm text-gray-600">Customer Name</p>
                      <p className="font-medium text-gray-900">{berth.customerName}</p>
                    </div>
                  )}
                  {berth.customerId && (
                    <div>
                      <p className="text-sm text-gray-600">Customer ID</p>
                      <p className="font-medium text-gray-900">{berth.customerId}</p>
                    </div>
                  )}
                  {berth.vesselName && (
                    <div>
                      <p className="text-sm text-gray-600">Vessel Name</p>
                      <p className="font-medium text-gray-900">{berth.vesselName}</p>
                    </div>
                  )}
                  {berth.vesselId && (
                    <div>
                      <p className="text-sm text-gray-600">Vessel ID</p>
                      <p className="font-medium text-gray-900">{berth.vesselId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rental & Booking */}
            {(berth.rentalAgreementId || berth.bookingId) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Rental & Booking</h3>
                <div className="grid grid-cols-2 gap-4">
                  {berth.rentalAgreementId && (
                    <div>
                      <p className="text-sm text-gray-600">Rental Agreement ID</p>
                      <p className="font-medium text-gray-900">{berth.rentalAgreementId}</p>
                    </div>
                  )}
                  {berth.bookingId && (
                    <div>
                      <p className="text-sm text-gray-600">Booking ID</p>
                      <p className="font-medium text-gray-900">{berth.bookingId}</p>
                    </div>
                  )}
                  {berth.dateIn && (
                    <div>
                      <p className="text-sm text-gray-600">Date In</p>
                      <p className="font-medium text-gray-900">{formatDate(berth.dateIn)}</p>
                    </div>
                  )}
                  {berth.dateOut && (
                    <div>
                      <p className="text-sm text-gray-600">Date Out</p>
                      <p className="font-medium text-gray-900">{formatDate(berth.dateOut)}</p>
                    </div>
                  )}
                  {berth.bookingEnteredDate && (
                    <div>
                      <p className="text-sm text-gray-600">Booking Entered Date</p>
                      <p className="font-medium text-gray-900">{formatDate(berth.bookingEnteredDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service Information */}
            {(berth.serviceStatus || berth.serviceLineType) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {berth.serviceStatus && (
                    <div>
                      <p className="text-sm text-gray-600">Service Status</p>
                      <p className="font-medium text-gray-900">{berth.serviceStatus}</p>
                    </div>
                  )}
                  {berth.serviceLineType && (
                    <div>
                      <p className="text-sm text-gray-600">Service Line Type</p>
                      <p className="font-medium text-gray-900">{berth.serviceLineType}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Berth ID</p>
                  <p className="font-medium text-gray-900">{berth.berthId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}