package com.movefuel.mufil2.ui.screens.bar

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BAR004ProductLookupScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BAR_004",
        title = "Product Lookup",
        subtitle = "Barcode and nutrition-label capture with fallback entry.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BAR_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_003,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Barcode detected","Looking up product","Preparing product"), 1)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BAR004ProductLookupScreenPreview() {
    MoveFuelTheme { BAR004ProductLookupScreen {} }
}
