package com.movefuel.mufil2.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.rememberNavController
import com.movefuel.mufil2.ui.navigation.MoveFuelNavGraph

@Composable
fun MoveFuelApp() {
    val navController = rememberNavController()
    MoveFuelNavGraph(navController)
}
