hydrateFromDb: async () => {
  const {
    getTables,
    getProducts,
    getOrders,
    getZones,
    getUsers
  } = await import('../db/database');

  try {
    const [tables, products, orders, zones, users] = await Promise.all([
      getTables(),
      getProducts(),
      getOrders(),
      getZones(),
      getUsers(),
    ]);

    set({
      tables,
      products,
      orders,
      zones,
      users,
    });

    console.log('Hydration OK');
  } catch (e) {
    console.error('Hydration failed', e);
  }
},