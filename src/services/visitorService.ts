interface Visitor {
  id: number;
  status: 'ACTIVE' | 'CHECKED_OUT' | 'ARCHIVED';
  checkOutTime?: Date;
}

export class VisitorService {
  /**
   * Archive visitors who have been checked out for more than 24 hours
   */
  static async archiveOldVisitors(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // In a real implementation, this would update the database
      // For demo purposes, we'll just log what would be archived
      console.log(`Archiving visitors checked out before: ${twentyFourHoursAgo.toISOString()}`);

      // Mock archiving logic
      const mockArchivedCount = Math.floor(Math.random() * 3); // 0-2 visitors archived
      console.log(`Archived ${mockArchivedCount} visitors`);

      // In real implementation:
      // const result = await prisma.visitor.updateMany({
      //   where: {
      //     status: 'CHECKED_OUT',
      //     checkOutTime: {
      //       lt: twentyFourHoursAgo
      //     }
      //   },
      //   data: {
      //     status: 'ARCHIVED'
      //   }
      // });
      // console.log(`Archived ${result.count} visitors`);

    } catch (error) {
      console.error('Error archiving old visitors:', error);
      throw error;
    }
  }

  /**
   * Get visitor statistics
   */
  static async getVisitorStats(): Promise<{
    active: number;
    checkedOut: number;
    archived: number;
    totalToday: number;
  }> {
    try {
      // Mock statistics for demo
      return {
        active: 2,
        checkedOut: 1,
        archived: 5,
        totalToday: 3,
      };

      // In real implementation:
      // const [active, checkedOut, archived, todayStats] = await Promise.all([
      //   prisma.visitor.count({ where: { status: 'ACTIVE' } }),
      //   prisma.visitor.count({ where: { status: 'CHECKED_OUT' } }),
      //   prisma.visitor.count({ where: { status: 'ARCHIVED' } }),
      //   prisma.visitor.count({
      //     where: {
      //       checkInTime: {
      //         gte: new Date(new Date().setHours(0, 0, 0, 0))
      //       }
      //     }
      //   })
      // ]);

      // return {
      //   active,
      //   checkedOut,
      //   archived,
      //   totalToday: todayStats
      // };

    } catch (error) {
      console.error('Error getting visitor stats:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic archiving (runs every 24 hours)
   */
  static startArchivingScheduler(): void {
    // Run initial archive
    this.archiveOldVisitors();

    // Schedule to run every 24 hours
    setInterval(() => {
      this.archiveOldVisitors();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    console.log('Visitor archiving scheduler started - runs every 24 hours');
  }
}