package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH014PantryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_014",
        title = "Pantry",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_013,
        onNavigate = onNavigate,
    ) {
            MFListItem("Rice","Already in pantry","Available")
            MFListItem("Olive oil","Already in pantry","Available")
            MFListItem("Salt","Already in pantry","Available")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH014PantryScreenPreview() {
    MoveFuelTheme { FSH014PantryScreen {} }
}
