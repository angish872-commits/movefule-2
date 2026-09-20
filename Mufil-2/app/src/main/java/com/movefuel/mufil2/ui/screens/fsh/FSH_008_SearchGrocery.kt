package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH008SearchGroceryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_008",
        title = "Search Grocery",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_007,
        onNavigate = onNavigate,
    ) {
            MFField("Search grocery","yogurt")
            MFListItem("Greek yogurt","Grocery result","Add")
            MFListItem("Plain yogurt","Grocery result","Add")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH008SearchGroceryScreenPreview() {
    MoveFuelTheme { FSH008SearchGroceryScreen {} }
}
