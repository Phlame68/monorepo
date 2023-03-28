module.exports = {
  async up(db) {
    await db.collection('referralrewardclaims').updateMany({ amount: { $exists: true } },
      [{
        $set: {
          amount:
            { $toInt: "$amount" },
        }
      }]
    );
  },

  async down() {
    //
  }
};
