package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP023TextImportScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_023",
        title = "Text Import",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_024,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_022,
        onNavigate = onNavigate,
    ) {
            MFField("Recipe text","Paste ingredients and steps")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP023TextImportScreenPreview() {
    MoveFuelTheme { RCP023TextImportScreen {} }
}
