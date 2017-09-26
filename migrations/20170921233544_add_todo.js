
exports.up = function(knex, Promise) {
  return knex.schema.createTable('todo', t => {
    t.increments()
    t.string('title').notNullable()
    t.boolean('complete').defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.integer('user_id').unsigned().notNullable()
    t.foreign('user_id').references('user.id')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('todo')
};
