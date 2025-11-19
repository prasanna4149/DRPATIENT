import React, { useState } from 'react';
import { Search, Grid, List } from 'lucide-react';
import { useData } from '../../contexts/DataContext';


const Browse = () => {
  const { categories } = useData();
  console.log(categories); // 👈 Add this line
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Medical Specialties</h1>
        <p className="text-gray-600">Find and book appointments with verified doctors across various specialties</p>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-8 flex justify-end">
        <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors duration-200 ${
              viewMode === 'grid'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors duration-200 ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Categories Grid/List */}
      {categories.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No specialties available</h3>
          <p className="text-gray-500">Please check back later</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          {categories.map((category) => (
            <div
              key={category.id}
              className={`relative bg-white h-96 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-400 group overflow-hidden cursor-pointer ${
                viewMode === 'list' ? 'flex items-center p-6' : 'p-6'
              }`}
            >
              <div className={viewMode === 'list' ? 'flex-1' : ''}>
{category.image && (
 
  <img
    src={category.image}
    alt={category.name}
    className="w-full h-48 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform duration-500"
  />
)}  
  
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  
                  {category.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors duration-200">Browse Doctors</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-all duration-300">
                    <div className="w-2.5 h-2.5 bg-blue-600 group-hover:bg-white rounded-full transform group-hover:scale-125 transition-transform duration-300"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {categories.length > 0 && (
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Get Started?</h3>
            <p className="text-gray-600 mb-4">
              Choose from {categories.length} medical specialties and book appointments with verified doctors
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Verified Doctors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Secure Messaging</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600">Easy Booking</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Browse;