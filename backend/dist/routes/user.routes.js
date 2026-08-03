"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken); // Protect all user routes
router.get('/', user_controller_1.getUsers);
router.post('/', user_controller_1.createUser);
router.delete('/:id', user_controller_1.deleteUser);
exports.default = router;
