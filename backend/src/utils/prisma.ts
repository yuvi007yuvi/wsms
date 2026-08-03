import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);
        
        if (model && model !== 'SyncQueue') {
          if (['create', 'update', 'delete'].includes(operation)) {
            try {
              // Ensure we have an ID for the record (or generate a placeholder if not present)
              const recordId = (result as any)?.id || 'unknown';
              
              await basePrisma.syncQueue.create({
                data: {
                  action: operation.toUpperCase(),
                  tableName: model,
                  recordId: recordId,
                  payload: result ? JSON.stringify(result) : null
                }
              });
            } catch (error) {
              console.error(`Failed to queue ${operation} for ${model}:`, error);
            }
          }
        }
        
        return result;
      }
    }
  }
});

export default prisma;
