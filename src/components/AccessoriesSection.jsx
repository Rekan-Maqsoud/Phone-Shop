import React from 'react';

const AccessoriesSection = ({ 
  t, 
  admin, 
  handleArchiveToggle, 
  loading 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.accessories || 'Accessories'}</h2>
        <button
          onClick={() => {
            admin.setEditAccessory(null);
            admin.setShowAccessoryModal(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:scale-105 hover:from-emerald-600 hover:to-green-600 transition-all duration-200"
        >
          {t.addAccessory || 'Add Accessory'}
        </button>
      </div>
      
      {admin.accessories.filter(accessory => !accessory.archived).length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-xl">{t.noAccessories || 'No accessories yet'}</p>
          <p className="text-sm mt-2">{t.addFirstAccessory || 'Add your first accessory to get started'}</p>
        </div>
      ) : (
        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">{t.name}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.brand || 'Brand'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.type || 'Type'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.buyingPrice || 'Cost'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.sellingPrice || 'Price'}</th>
                  <th className="px-6 py-4 text-left font-bold">{t.stock}</th>
                  <th className="px-6 py-4 text-center font-bold">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {admin.accessories.filter(accessory => !accessory.archived).map((accessory, idx) => (
                  <tr key={accessory.id} className={`border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800/50'} hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors`}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{accessory.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.brand || '-'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.type || '-'}</td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-semibold">${accessory.buying_price || accessory.price}</td>
                    <td className="px-6 py-4 text-green-600 dark:text-green-400 font-bold">${accessory.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        accessory.stock <= 2 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        accessory.stock <= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {accessory.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            admin.setEditAccessory(accessory);
                            admin.setShowAccessoryModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                        >
                          {t.edit}
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(accessory, true)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                          disabled={loading}
                        >
                          {t.archive || 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessoriesSection;
