package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP022WebImportScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_022",
        title = "Web Import",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_023,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_021,
        onNavigate = onNavigate,
    ) {
            MFField("Recipe URL","https://…")
            MFNotice("Persistent processing","MoveFuel keeps the import state visible in Recipes.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP022WebImportScreenPreview() {
    MoveFuelTheme { RCP022WebImportScreen {} }
}
