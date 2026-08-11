"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkSubscription_1 = require("../middleware/checkSubscription");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription); // Protect all user routes
router.get('/', user_controller_1.getUsers);
router.post('/', user_controller_1.createUser);
router.put('/:id', user_controller_1.updateUser);
router.delete('/:id', user_controller_1.deleteUser);
exports.default = router;
