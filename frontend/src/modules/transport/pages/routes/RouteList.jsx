import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { RouteStopsTimeline } from '../../components/ui/RouteStopsTimeline';
import { AddEditRoute } from './AddEditRoute';
import { MOCK_ROUTES, MOCK_PICKUP_POINTS } from '../../utils/constants';
import { Route, Plus, Edit2, Navigation, Clock } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const RouteList = () => {
  const toast = useToast();
  const [routes, setRoutes] = useState(MOCK_ROUTES);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  
  const [selectedRouteForStops, setSelectedRouteForStops] = useState(null);
  const [stopsOpen, setStopsOpen] = useState(false);

  const handleAddSuccess = (newRoute) => {
    if (editingRoute) {
      setRoutes(prev => prev.map(r => r.id === editingRoute.id ? newRoute : r));
    } else {
      setRoutes(prev => [...prev, newRoute]);
    }
    setWizardOpen(false);
    setEditingRoute(null);
  };

  const handleEditClick = (route) => {
    setEditingRoute(route);
    setWizardOpen(true);
  };

  const handleViewStops = (route) => {
    setSelectedRouteForStops(route);
    setStopsOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Route Management"
        subtitle="Configure state road routes, map pickup stops, and calculate durations."
        actions={
          <button
            onClick={() => {
              setEditingRoute(null);
              setWizardOpen(true);
            }}
            className="h-10 px-4 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Route</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route) => {
          const occupancy = Math.min(Math.floor((route.studentCount / 45) * 100), 100);

          return (
            <div 
              key={route.id}
              className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:shadow-xs group hover:border-cyan-300 dark:hover:border-cyan-900/50 transition-all duration-205"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded-xl">
                    <Route className="h-5.5 w-5.5" />
                  </div>
                  <Badge variant={route.status === 'Active' ? 'success' : 'default'}>
                    {route.status}
                  </Badge>
                </div>

                <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {route.routeName}
                </h4>
                <p className="text-3xs font-mono font-bold text-slate-400 mt-0.5">Route Code: {route.routeCode}</p>

                {/* Occupancy bar */}
                <div className="mt-4 space-y-1 text-3xs font-semibold text-slate-450 uppercase">
                  <div className="flex justify-between">
                    <span>Route Occupancy</span>
                    <span>{route.studentCount} Students ({occupancy}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-cyan-650 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>

                {/* Details summary */}
                <div className="grid grid-cols-2 gap-4 text-3xs font-medium text-slate-500 mt-5 pt-3 border-t border-slate-50 dark:border-slate-850">
                  <div className="flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Distance: {route.distance}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Duration: {route.estimatedDuration}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-850 flex gap-2">
                <button
                  onClick={() => handleViewStops(route)}
                  className="flex-1 h-9 text-xs font-semibold border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors"
                >
                  View Stops
                </button>
                <button
                  onClick={() => handleEditClick(route)}
                  className="px-3 h-9 text-xs font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-705 dark:bg-cyan-955/20 dark:hover:bg-cyan-900/35 rounded-xl transition-colors"
                  title="Modify Route Specs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stops Timeline modal */}
      <Modal
        isOpen={stopsOpen}
        onClose={() => {
          setStopsOpen(false);
          setSelectedRouteForStops(null);
        }}
        title={selectedRouteForStops ? `Stops Timeline: ${selectedRouteForStops.routeName}` : 'Stops'}
        size="md"
      >
        {selectedRouteForStops && (
          <div className="space-y-4">
            <RouteStopsTimeline
              stops={selectedRouteForStops.stops}
              pickupPoints={MOCK_PICKUP_POINTS}
            />
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-850">
              <button
                onClick={() => setStopsOpen(false)}
                className="h-10 px-4 text-xs font-semibold border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl"
              >
                Close Timeline
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* AddEdit Route Modal */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingRoute(null);
        }}
        title={editingRoute ? 'Modify Route Specs' : 'Register New Route'}
        size="lg"
      >
        <AddEditRoute
          route={editingRoute}
          onSuccess={handleAddSuccess}
          onCancel={() => {
            setWizardOpen(false);
            setEditingRoute(null);
          }}
        />
      </Modal>
    </div>
  );
};
